import { Buffer } from 'buffer';
import { Readable } from 'stream';
import { isDecimalDigit, isHexDigit, isWordChar } from './lex';
import { NT, Parser, ParseTree, T, table } from './lr1';
import { Line, Scanner, Token } from './scanner';

interface RegisterOperand {
    kind: 'reg';
    num: number;
}

interface IntegerOperand {
    kind: 'int';
    val: number;
}

interface LabelOperand {
    kind: 'label';
    label: string;
}

interface StringOperand {
    kind: 'string';
    contents: string;
}

interface Instruction {
    kind: 'instr';
    op: string;
    operands: (RegisterOperand|IntegerOperand|LabelOperand)[];
}

interface PseudoOp {
    kind: 'pseudoop';
    op: string;
    operand: StringOperand|IntegerOperand|LabelOperand|undefined;
}

interface Section {
    startAddr: number;
    instructions: (Instruction|PseudoOp)[];
}

interface Assembly {
    sections: Section[];
    labels: {[s: string]: [number, number]};
}

class Assembler {
    private scanner: Scanner;
    private parser: Parser<NT, T>;

    public constructor(fp: Readable) {
        this.scanner = new Scanner(fp);
        this.parser = new Parser<NT, T>(table);
    }

    public async parse(): Promise<Assembly> {
        const assembly: Assembly = {sections: [], labels: {}};
        const lines: Line<T>[] = await this.scanner.scan();
        const labels: string[] = [];
        let currentSection: Section|null = null;

        for (const line of lines) {
            const parseTree = this.parser.parse(line);
            const op = parseTree.children[0];

            switch (op.token) {
                case 'label':
                    if (!currentSection) {
                        throw new Error(`stray label on line ${line.num}`);
                    }
                    this.pushLabel(labels, this.parseLabel(op), assembly, line);
                    break;

                case 'instr-line':
                    if (!currentSection) {
                        throw new Error(`stray instruction on line ${line.num}`);
                    }
                    const instrLabel = this.parseLineLabel(op);
                    if (instrLabel) {
                        this.pushLabel(labels, instrLabel, assembly, line);
                    }

                    currentSection.instructions.push(this.parseInstrLine(op));
                    this.applyLabels(labels, assembly, currentSection);
                    break;

                case 'pseudoop-line':
                    const pseudoOpLabel = this.parseLineLabel(op);
                    if (pseudoOpLabel) {
                        this.pushLabel(labels, pseudoOpLabel, assembly, line);
                    }

                    const pseudoop = this.parsePseudoOpLine(op);

                    // need an .orig
                    if (!currentSection) {
                        if (pseudoop.op !== 'orig') {
                            throw new Error(`stray assembler directive on ` +
                                            `line ${line.num} (expected .orig)`);
                        }
                        if (!pseudoop.operand || pseudoop.operand.kind !== 'int') {
                            throw new Error(`.orig on line ${line.num} needs ` +
                                            `an address operand`);
                        }
                        if (labels.length > 0) {
                            throw new Error(`.orig on line ${line.num} should ` +
                                            `not have a label`);
                        }
                        currentSection = {startAddr: pseudoop.operand.val,
                                          instructions: []};
                        assembly.sections.push(currentSection);
                    } else if (pseudoop.op === 'end') {
                        if (pseudoop.operand) {
                            throw new Error(`.end on line ${line.num} should ` +
                                            `not have an operand`);
                        }
                        if (labels.length > 0) {
                            throw new Error(`.end on line ${line.num} should ` +
                                            `not have a label`);
                        }
                        currentSection = null;
                    } else {
                        currentSection.instructions.push(pseudoop);
                        this.applyLabels(labels, assembly, currentSection);
                    }
                    break;
            }
        }

        if (currentSection) {
            throw new Error('missing an .end at the end of file');
        }

        return assembly;
    }

    // Takes either an insr-line or a pseudoop-line, returns its label
    // or null
    private parseLineLabel(line: ParseTree<NT, T>): string|null {
        if (line.children[0].token === 'label') {
            const label = line.children[0];
            return this.parseLabel(label);
        } else {
            return null;
        }
    }

    private parseLabel(label: ParseTree<NT, T>): string {
        const word = label.children[0];
        return word.val as string;
    }

    private parsePseudoOpLine(pseudoOpLine: ParseTree<NT, T>): PseudoOp {
        const pseudoOpCall = pseudoOpLine.children[pseudoOpLine.children.length - 1];
        const op = (pseudoOpCall.children[0].val as string).substring(1).toLowerCase();
        let operand: StringOperand|IntegerOperand|LabelOperand|undefined;

        if (pseudoOpCall.children.length === 1) {
            operand = undefined;
        } else {
            operand = (this.parseOperand(pseudoOpCall.children[1]) as StringOperand|IntegerOperand|LabelOperand);
        }

        return {kind: 'pseudoop', op, operand};
    }

    private parseInstrLine(instrLine: ParseTree<NT, T>): Instruction {
        const instruction: Instruction = {kind: 'instr', op: '', operands: []};
        const instr = instrLine.children[instrLine.children.length - 1];

        const word = instr.children[0];
        instruction.op = (word.val as string).toLowerCase();

        if (instr.children.length > 1) {
            let foundLeaf = false;
            let instrOperands = instr.children[1];

            while (!foundLeaf) {
                let operandIndex: number;
                if (instrOperands.children.length === 1) {
                    operandIndex = 0;
                    foundLeaf = true;
                } else {
                    operandIndex = 2;
                }
                const parsed = this.parseOperand(instrOperands.children[operandIndex]);
                instruction.operands.push(parsed as RegisterOperand|IntegerOperand|LabelOperand);

                if (!foundLeaf) {
                    instrOperands = instrOperands.children[0];
                }
            }

            instruction.operands.reverse();
        }

        return instruction;
    }

    // operand here is either a pseudoop-operand or an operand NT
    private parseOperand(operand: ParseTree<NT, T>):
            RegisterOperand|IntegerOperand|LabelOperand|StringOperand  {
        const someOperand = operand.children[0];
        const val = someOperand.val as string;
        switch (someOperand.token) {
            case 'char':
                return {kind: 'int', val: this.parseString(val.slice(1, -1)).charCodeAt(0)};
            case 'string':
                return {kind: 'string', contents: this.parseString(val.slice(1, -1))};
            case 'reg':
                return {kind: 'reg', num: parseInt(val.substring(1), 10)};
            case 'int-decimal':
                return {kind: 'int', val: parseInt(val, 10)};
            case 'int-hex':
                return {kind: 'int', val: parseInt(val.substring(1), 16)};
            case 'word':
                return {kind: 'label', label: val};
            default:
                throw new Error(`unknown operand ${someOperand.token}`);
        }
    }

    private parseString(val: string): string {
        let result = '';
        let escape = false;
        for (let i = 0; i < val.length; i++) {
            const c = val.charAt(i);

            if (escape) {
                switch (c) {
                    case 'n':
                        result += '\n';
                        break;
                    case 'r':
                        result += '\r';
                        break;
                    case 't':
                        result += '\t';
                        break;
                    case '\\':
                        result += '\\';
                        break;
                    default:
                        result += c;
                }
                escape = false;
            } else {
                if (c === '\\') {
                    escape = true;
                } else {
                    result += c;
                }
            }
        }
        return result;
    }

    private pushLabel(labels: string[], label: string, assembly: Assembly,
                      line: Line<T>): void {
        if (assembly.labels.hasOwnProperty(label)) {
            throw new Error(`duplicate label ${label} on line ${line.num}`);
        }

        labels.push(label);
    }

    private applyLabels(labels: string[], assembly: Assembly,
                        currentSection: Section): void {
        while (labels.length > 0) {
            assembly.labels[labels.pop() as string] =
                [assembly.sections.length - 1,
                 currentSection.instructions.length - 1];
        }
    }
}

export { Assembler, Assembly, Section, Instruction, RegisterOperand,
         IntegerOperand, LabelOperand };
