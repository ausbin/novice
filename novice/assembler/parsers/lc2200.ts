// Parser for LC-2200 syntax
import { Isa } from '../../isa';
import { ParseTable, ParseTree } from '../lr1';
import { Grammar } from './grammar';
import { grammar, NT, T } from './grammars/lc2200';
import { AbstractParser, Instruction, IntegerOperand, LabelOperand, Line,
         ParsedAssembly, Parser, PseudoOp, RegisterOperand,
         Section } from './parser';
import table from './tables/lc2200';

interface ParseContext {
}

class Lc2200Parser extends AbstractParser<ParseContext, NT, T> {
    protected getTable(): ParseTable<NT, T> {
        return table;
    }

    protected getGrammar(): Grammar<NT, T> {
        return grammar;
    }

    protected initCtx(): ParseContext {
        return {};
    }

    protected parseLine(ctx: ParseContext,
                        parseTree: ParseTree<NT, T>,
                        line: Line<T>): void {
    }

    protected finish(ctx: ParseContext): ParsedAssembly {
        return {sections: [], labels: {}};
    }
}

export default Lc2200Parser;
