// Parser for LC-2200 syntax
import { Assembly, getAliases, Instruction, IntegerOperand, Isa, LabelOperand,
         PseudoOp, RegisterOperand, Section  } from '../../isa';
import { ParseTable, ParseTree } from '../lr1';
import { Grammar } from './grammar';
import { grammar, NT, T } from './grammars/lc2200';
import { AbstractParser, Line, Parser } from './parser';
import table from './tables/lc2200';

interface ParseContext {
    instrs: (Instruction|PseudoOp)[];
    labels: {[s: string]: number};
    labelQueue: string[];
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
                ctx.labelQueue = ctx.labelQueue.concat(this.parseLabels(what));
                break;

            case 'instr':
                ctx.labelQueue = ctx.labelQueue.concat(
                    this.parseLabels(what.children[0]));

                const word = what.children[1];
                const op = (word.val as string).toLowerCase();

                let operands: (RegisterOperand|IntegerOperand|LabelOperand)[];
                if (what.children.length === 3) {
                    const instrOperands = what.children[2];
                    operands = this.parseInstrOperands(instrOperands);
                } else {
                    operands = [];
                }

                ctx.instrs.push({kind: 'instr', line: line.num, op, operands});
                this.popLabels(ctx);
                break;

            case 'pseudoop-line':
                ctx.labelQueue = ctx.labelQueue.concat(
                    this.parseLabels(what.children[0]));

                const pseudoop = what.children[1];
                const opName = (pseudoop.val as string).slice(1).toLowerCase();
                const operand = (what.children.length === 3)
                                ? (this.parseOperand(what.children[2]) as (IntegerOperand|LabelOperand))
                                : undefined;

                ctx.instrs.push({kind: 'pseudoop', line: line.num, op: opName,
                                 operand});
                this.popLabels(ctx);
                break;
        }
    }

    protected finish(ctx: ParseContext): Assembly {
        if (ctx.labelQueue.length > 0) {
            // TODO: line numbers
            throw new Error(`stray label ${ctx.labelQueue[0]} at end of file`);
        }

        const asm: Assembly = {sections: [{startAddr: 0, instructions: ctx.instrs}],
                               labels: {}};
        Object.keys(ctx.labels).forEach(
            label => { asm.labels[label] = [0, ctx.labels[label]]; });
        return asm;
    }

    private popLabels(ctx: ParseContext): void {
        while (ctx.labelQueue.length > 0) {
            const label = ctx.labelQueue.pop() as string;
            // TODO: detect dupe labels
            ctx.labels[label] = ctx.instrs.length - 1;
        }
    }

    private parseLabels(label: ParseTree<NT, T>): string[] {
        if (label.children.length === 0) {
            return [];
        } else {
            // Left recursion
            const more = this.parseLabels(label.children[0]);
            more.push(label.children[1].val as string);
            return more;
        }
    }

    private parseInstrOperands(instrOperands: ParseTree<NT, T>):
            (RegisterOperand|IntegerOperand|LabelOperand)[] {
        const operand = (instrOperands.children.length === 1)
                        ? instrOperands.children[0]
                        : instrOperands.children[2];
        const parsedOperand = this.parseOperand(operand);

        if (instrOperands.children.length === 1) {
            return [parsedOperand];
        } else {
            const instrOperands2 = instrOperands.children[0];
            const operands = this.parseInstrOperands(instrOperands2);
            operands.push(parsedOperand);
            return operands;
        }
    }

    private parseOperand(operand: ParseTree<NT, T>):
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
                const regno = /^\d+$/.test(alias)
                              ? parseInt(alias, 10)
                              // TODO: handle invalid aliases
                              : getAliases(this.isa, prefix)[alias];
                return {kind: 'reg', prefix, num: regno};

            case 'char':
                return {kind: 'int', val: val.charCodeAt(0)};

            default:
                throw new Error(`unrecognized operand type \`${what.token}'`);
        }
    }
}

export default Lc2200Parser;
