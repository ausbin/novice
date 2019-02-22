// Parser for LC-2200 syntax
import { Assembly, Instruction, IntegerOperand, Isa, LabelOperand, PseudoOp,
         RegisterOperand, Section  } from '../../isa';
import { ParseTable, ParseTree } from '../lr1';
import { Grammar } from './grammar';
import { grammar, NT, T } from './grammars/lc2200';
import { AbstractParser, Line, Parser } from './parser';
import table from './tables/lc2200';

interface ParseContext {
    instrs: (Instruction|PseudoOp)[];
    labels: {[s: string]: number};
    labelQueue: [string, number][];
}

class Lc2200Parser extends AbstractParser<ParseContext, NT, T> {
    protected getTable(): ParseTable<NT, T> {
        return table;
    }

    protected getGrammar(): Grammar<NT, T> {
        return grammar;
    }

    protected initCtx(): ParseContext {
        return {instrs: [], labels: {}, labelQueue: []};
    }

    protected parseLine(ctx: ParseContext,
                        parseTree: ParseTree<NT, T>,
                        line: Line<T>): void {
        const what = parseTree.children[0];

        switch (what.token) {
            case 'label':
                ctx.labelQueue = ctx.labelQueue.concat(
                    this.parseLabels(what, line.num));
                break;

            case 'instr':
                ctx.labelQueue = ctx.labelQueue.concat(
                    this.parseLabels(what.children[0], line.num));

                const word = what.children[1];
                const op = (word.val as string).toLowerCase();

                let operands: (RegisterOperand|IntegerOperand|LabelOperand)[];
                if (what.children.length === 3) {
                    const instrOperands = what.children[2];
                    operands = this.parseInstrOperands(instrOperands, line.num);
                } else {
                    operands = [];
                }

                ctx.instrs.push({kind: 'instr', line: line.num, op, operands});
                this.popLabels(ctx);
                break;

            case 'pseudoop-line':
                ctx.labelQueue = ctx.labelQueue.concat(
                    this.parseLabels(what.children[0], line.num));

                const pseudoop = what.children[1];
                const opName = (pseudoop.val as string).slice(1).toLowerCase();
                const operand = (what.children.length === 3)
                                ? (this.parseOperand(what.children[2], line.num) as (IntegerOperand|LabelOperand))
                                : undefined;

                ctx.instrs.push({kind: 'pseudoop', line: line.num, op: opName,
                                 operand});
                this.popLabels(ctx);
                break;
        }
    }

    protected finishParse(ctx: ParseContext): Assembly {
        if (ctx.labelQueue.length > 0) {
            const [label, line] = ctx.labelQueue[0];
            throw new Error(`stray label ${label} at end of file on ` +
                            `line ${line}`);
        }

        const asm: Assembly = {sections: [{startAddr: 0, instructions: ctx.instrs}],
                               labels: {}};
        Object.keys(ctx.labels).forEach(
            label => { asm.labels[label] = [0, ctx.labels[label]]; });
        return asm;
    }

    private popLabels(ctx: ParseContext): void {
        while (ctx.labelQueue.length > 0) {
            const [label, line] = ctx.labelQueue.pop() as [string, number];

            if (ctx.labels.hasOwnProperty(label)) {
                throw new Error(`duplicate label ${label} on line ${line}`);
            }

            ctx.labels[label] = ctx.instrs.length - 1;
        }
    }

    private parseLabels(label: ParseTree<NT, T>, line: number):
            [string, number][] {
        if (label.children.length === 0) {
            return [];
        } else {
            // Left recursion
            const more = this.parseLabels(label.children[0], line);
            more.push([label.children[1].val as string, line]);
            return more;
        }
    }

    private parseInstrOperands(instrOperands: ParseTree<NT, T>, line: number):
            (RegisterOperand|IntegerOperand|LabelOperand)[] {
        const operand = (instrOperands.children.length === 1)
                        ? instrOperands.children[0]
                        : instrOperands.children[2];
        const parsedOperand = this.parseOperand(operand, line);

        if (instrOperands.children.length === 1) {
            return [parsedOperand];
        } else {
            const instrOperands2 = instrOperands.children[0];
            const operands = this.parseInstrOperands(instrOperands2, line);
            operands.push(parsedOperand);
            return operands;
        }
    }

    private parseOperand(operand: ParseTree<NT, T>, line: number):
            RegisterOperand|IntegerOperand|LabelOperand {
        const what = operand.children[0];
        let val = what.val as string;

        switch (what.token) {
            case 'word':
                return {kind: 'label', label: val};

            case 'int-dec':
                return {kind: 'int', val: parseInt(val, 10)};

            case 'int-hex':
                return {kind: 'int', val: parseInt(val.slice(2), 16)};

            case 'reg':
                val = val.toLowerCase();
                const prefix = val.charAt(0);
                const alias = val.slice(1);

                let regno: number;
                if (/^\d+$/.test(alias)) {
                    regno = parseInt(alias, 10);
                } else {
                    const aliases = this.isa.getRegAliases(prefix);

                    if (!aliases.hasOwnProperty(alias)) {
                        throw new Error(`unknown register alias ${alias} on ` +
                                        `line ${line}`);
                    }

                    regno = aliases[alias];
                }
                return {kind: 'reg', prefix, num: regno};

            default:
                throw new Error(`unrecognized operand type \`${what.token}'`);
        }
    }
}

export default Lc2200Parser;
