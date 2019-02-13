// Parser for complx syntax
import { Assembly, Instruction, IntegerOperand, Isa,
         isInstruction, LabelOperand, PseudoOp, RegisterOperand,
         Section, StringOperand } from '../../isa';
import { ParseTable, ParseTree } from '../lr1';
import { Grammar } from './grammar';
import { grammar, NT, T } from './grammars/complx';
import { AbstractParser, Line, Parser } from './parser';
import table from './tables/complx';

interface ParseContext {
    currentSection: Section|null;
    labels: string[];
    assembly: Assembly;
}

class ComplxParser extends AbstractParser<ParseContext, NT, T> {
    protected getTable(): ParseTable<NT, T> {
        return table;
    }

    protected getGrammar(): Grammar<NT, T> {
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
            case 'word':
                // Two cases for a word on its own:
                // 1. it's an instruction, ex:
                //        halt
                // 2. it's a label, ex:
                //        cleanup
                // We can't handle these two cases in the ISA-agnostic
                // grammar unambiguously, so handle them here when
                // inspecting the parse tree
                const isInstr = this.isInstruction(ctx, op);

                if (!ctx.currentSection) {
                    const what = isInstr ? 'instruction' : 'label';
                    throw new Error(`stray ${what} on line ${line.num}`);
                }

                if (isInstr) {
                    ctx.currentSection.instructions.push(
                        {kind: 'instr', line: line.num,
                         op: this.parseLabel(op).toLowerCase(),
                         operands: []});
                    this.applyLabels(ctx);
                } else {
                    this.pushLabel(ctx, this.parseLabel(op), line);
                }
                break;

            case 'instr-line':
                if (!ctx.currentSection) {
                    throw new Error(`stray instruction on line ${line.num}`);
                }

                // Another ambiguity which plagues LC-3 assembly:
                // Which of these two cases is the following:
                //
                //     word word
                //
                // 1. A labelled solo instruction, ex:
                //        myhaltlabel halt
                // 2. An instruction with one label operand, like
                //        jsr myfunc
                //
                // To prevent being an ambiguous grammar, the grammar
                // permits only #2 (that is, the parse trees we receive
                // will contain only #2), so we need to handle case #1
                // here.
                let [instr, instrLabel] =
                    this.handleLabelledSoloInstr(ctx, line, op);

                if (!instr) {
                    instrLabel = this.parseLineLabel(op);
                    instr = this.parseInstrLine(op, line);
                }

                if (instrLabel) {
                    this.pushLabel(ctx, instrLabel, line);
                }

                ctx.currentSection.instructions.push(instr);
                this.applyLabels(ctx);
                break;

            case 'pseudoop-line':
                const pseudoOpLabel = this.parseLineLabel(op);
                if (pseudoOpLabel) {
                    this.pushLabel(ctx, pseudoOpLabel, line);
                }

                const pseudoop = this.parsePseudoOpLine(op, line);

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

    protected finishParse(ctx: ParseContext): Assembly {
        if (ctx.currentSection) {
            throw new Error('missing an .end at the end of file');
        }

        return ctx.assembly;
    }

    private isInstruction(ctx: ParseContext, op: ParseTree<NT, T>): boolean {
        const wordVal = this.parseLabel(op).toLowerCase();
        return isInstruction(this.isa, wordVal);
    }

    // Takes either an insr-line or a pseudoop-line, returns its label
    // or null
    private parseLineLabel(line: ParseTree<NT, T>): string|null {
        if (line.children[0].token === 'word') {
            return this.parseLabel(line.children[0]);
        } else {
            return null;
        }
    }

    private parseLabel(word: ParseTree<NT, T>): string {
        return word.val as string;
    }

    private parsePseudoOpLine(pseudoOpLine: ParseTree<NT, T>,
                              line: Line<T>): PseudoOp {
        const pseudoOpCall = pseudoOpLine.children[pseudoOpLine.children.length - 1];
        const op = (pseudoOpCall.children[0].val as string).substring(1).toLowerCase();
        let operand: StringOperand|IntegerOperand|LabelOperand|undefined;

        if (pseudoOpCall.children.length === 1) {
            operand = undefined;
        } else {
            operand = (this.parseOperand(pseudoOpCall.children[1]) as StringOperand|IntegerOperand|LabelOperand);
        }

        return {kind: 'pseudoop', line: line.num, op, operand};
    }

    private handleLabelledSoloInstr(ctx: ParseContext,
                                    line: Line<T>,
                                    instrLine: ParseTree<NT, T>):
            [Instruction|null, string|null] {
        // Intended to handle this parse tree:
        //
        //   instr-line
        //       |
        //     instr
        //     /   \
        //  word   instr-operands
        //              |
        //           operand
        //              |
        //             word

        if (instrLine.children.length === 1 &&
                instrLine.children[0].children[1].children.length === 1 &&
                instrLine.children[0].children[1].children[0].children[0].token === 'word' &&
                !this.isInstruction(ctx, instrLine.children[0].children[0])) {
            const label = this.parseLabel(instrLine.children[0].children[0]);
            const instr: Instruction = {
                kind: 'instr',
                line: line.num,
                op: this.parseLabel(instrLine.children[0]
                                             .children[1]
                                             .children[0]
                                             .children[0]).toLowerCase(),
                operands: []};
            return [instr, label];
        } else {
            return [null, null];
        }
    }

    private parseInstrLine(instrLine: ParseTree<NT, T>,
                           line: Line<T>): Instruction {
        const instruction: Instruction = {kind: 'instr', line: line.num,
                                          op: '', operands: []};
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
        // choose last child to avoid the annoying # before int operands
        const someOperand = operand.children[operand.children.length - 1];
        const val = someOperand.val as string;
        switch (someOperand.token) {
            case 'char':
                return {kind: 'int', val: this.parseString(val.slice(1, -1)).charCodeAt(0)};
            case 'string':
                return {kind: 'string', contents: this.parseString(val.slice(1, -1))};
            case 'reg':
                return {kind: 'reg', prefix: val.charAt(0).toLowerCase(),
                        num: parseInt(val.substring(1), 10)};
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
