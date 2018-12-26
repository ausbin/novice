// Parser for complx syntax
import { ParseTable, ParseTree } from '../lr1';
import { Grammar } from './grammar';
import { grammar, NT, T } from './grammars/complx';
import { AbstractParser, Instruction, IntegerOperand, LabelOperand, Line,
         ParsedAssembly, Parser, PseudoOp, RegisterOperand,
         Section, StringOperand } from './parser';
import table from './tables/complx';

interface ParseContext {
    currentSection: Section|null;
    labels: string[];
    assembly: ParsedAssembly;
}

class ComplxParser extends AbstractParser<ParseContext, NT> {
    protected getTable(): ParseTable<NT, T> {
        return table;
    }

    protected getGrammar(): Grammar<NT> {
        return grammar;
    }

    protected initCtx(): ParseContext {
        return {currentSection: null, labels: [],
                assembly: {sections: [], labels: {}}};
    }

    protected parseLine(ctx: ParseContext,
                        parseTree: ParseTree<NT, T>,
                        line: Line<T>): void {
        const op = parseTree.children[0];

        switch (op.token) {
            case 'label':
                if (!ctx.currentSection) {
                    throw new Error(`stray label on line ${line.num}`);
                }
                this.pushLabel(ctx, this.parseLabel(op), line);
                break;

            case 'instr-line':
                if (!ctx.currentSection) {
                    throw new Error(`stray instruction on line ${line.num}`);
                }
                const instrLabel = this.parseLineLabel(op);
                if (instrLabel) {
                    this.pushLabel(ctx, instrLabel, line);
                }

                ctx.currentSection.instructions.push(this.parseInstrLine(op));
                this.applyLabels(ctx);
                break;

            case 'pseudoop-line':
                const pseudoOpLabel = this.parseLineLabel(op);
                if (pseudoOpLabel) {
                    this.pushLabel(ctx, pseudoOpLabel, line);
                }

                const pseudoop = this.parsePseudoOpLine(op);

                // need an .orig
                if (!ctx.currentSection) {
                    if (pseudoop.op !== 'orig') {
                        throw new Error(`stray assembler directive on ` +
                                        `line ${line.num} (expected .orig)`);
                    }
                    if (!pseudoop.operand || pseudoop.operand.kind !== 'int') {
                        throw new Error(`.orig on line ${line.num} needs ` +
                                        `an address operand`);
                    }
                    if (ctx.labels.length > 0) {
                        throw new Error(`.orig on line ${line.num} should ` +
                                        `not have a label`);
                    }
                    ctx.currentSection = {startAddr: pseudoop.operand.val,
                                          instructions: []};
                    ctx.assembly.sections.push(ctx.currentSection);
                } else if (pseudoop.op === 'end') {
                    if (pseudoop.operand) {
                        throw new Error(`.end on line ${line.num} should ` +
                                        `not have an operand`);
                    }
                    if (ctx.labels.length > 0) {
                        throw new Error(`.end on line ${line.num} should ` +
                                        `not have a label`);
                    }
                    ctx.currentSection = null;
                } else {
                    ctx.currentSection.instructions.push(pseudoop);
                    this.applyLabels(ctx);
                }
                break;
        }
    }

    protected finish(ctx: ParseContext) {
        if (ctx.currentSection) {
            throw new Error('missing an .end at the end of file');
        }

        return ctx.assembly;
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

    private pushLabel(ctx: ParseContext, label: string, line: Line<T>): void {
        if (ctx.assembly.labels.hasOwnProperty(label)) {
            throw new Error(`duplicate label ${label} on line ${line.num}`);
        }

        ctx.labels.push(label);
    }

    private applyLabels(ctx: ParseContext): void {
        // This is already tested above, but test again here to please
        // the compiler
        if (!ctx.currentSection) {
            throw new Error('cannot apply labels outside a section');
        }

        while (ctx.labels.length > 0) {
            ctx.assembly.labels[ctx.labels.pop() as string] =
                [ctx.assembly.sections.length - 1,
                 ctx.currentSection.instructions.length - 1];
        }
    }
}

export default ComplxParser;
