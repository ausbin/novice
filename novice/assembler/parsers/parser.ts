import { Readable } from 'stream';
import { Isa } from '../../isa';
import { Parser as LR1Parser, ParseTable, ParseTree,
         TableGenerator } from '../lr1';
import { Line, Scanner, Token } from '../scanner';
import { Grammar, T, Ts } from './grammar';

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
    line: number;
    op: string;
    operands: (RegisterOperand|IntegerOperand|LabelOperand)[];
}

interface PseudoOp {
    kind: 'pseudoop';
    line: number;
    op: string;
    operand: StringOperand|IntegerOperand|LabelOperand|undefined;
}

interface Section {
    startAddr: number;
    instructions: (Instruction|PseudoOp)[];
}

interface ParsedAssembly {
    sections: Section[];
    labels: {[s: string]: [number, number]};
}

interface Parser {
    parse(isa: Isa, line: Line<T>[]): ParsedAssembly;
    // Pass back an object because higher levels of abstraction don't
    // care about what exactly is in here, it's just a blob of JSON
    genTable(): object;
}

// Performs pass 1 using an LR(1) parser
abstract class AbstractParser<Ctx, NT> implements Parser {
    private parser: LR1Parser<NT, T>;

    public constructor() {
        this.parser = new LR1Parser<NT, T>(this.getTable());
    }

    public parse(isa: Isa, lines: Line<T>[]): ParsedAssembly {
        const ctx = this.initCtx(isa);

        for (const line of lines) {
            const parseTree = this.parser.parse(line);
            this.parseLine(ctx, parseTree, line);
        }

        return this.finish(ctx);
    }

    public genTable(): ParseTable<NT, T> {
        const grammar = this.getGrammar();
        const tablegen = new TableGenerator(grammar.goal, grammar.productions, grammar.NTs, Ts);
        return tablegen.genTable();
    }

    protected abstract getTable(): ParseTable<NT, T>;
    protected abstract getGrammar(): Grammar<NT>;
    protected abstract initCtx(isa: Isa): Ctx;
    protected abstract parseLine(ctx: Ctx, parseTree: ParseTree<NT, T>,
                                 line: Line<T>): void;
    protected abstract finish(ctx: Ctx): ParsedAssembly;
}

export { Parser, AbstractParser, ParsedAssembly, Section, Instruction,
         RegisterOperand, IntegerOperand, LabelOperand, PseudoOp,
         StringOperand, Line };
