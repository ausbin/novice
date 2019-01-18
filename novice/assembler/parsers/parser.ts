import { Readable } from 'stream';
import { Isa } from '../../isa';
import { Parser as LR1Parser, ParseTable, ParseTree,
         TableGenerator } from '../lr1';
import { Line, Scanner, Token } from '../scanner';
import { Grammar } from './grammar';

interface RegisterOperand {
    kind: 'reg';
    prefix: string;
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
    parse(fp: Readable): Promise<ParsedAssembly>;
    // Pass back an object because higher levels of abstraction don't
    // care about what exactly is in here, it's just a blob of JSON
    genTable(): object;
}

// Performs pass 1 using an LR(1) parser
abstract class AbstractParser<Ctx, NT, T> implements Parser {
    protected isa: Isa;
    private scanner: Scanner<T>;
    private parser: LR1Parser<NT, T>;

    public constructor(isa: Isa) {
        this.isa = isa;
        this.scanner = new Scanner<T>(this.getGrammar().getDFAs(isa));
        this.parser = new LR1Parser<NT, T>(this.getTable());
    }

    public async parse(fp: Readable): Promise<ParsedAssembly> {
        return this.parseLines(await this.scanner.scan(fp));
    }

    public genTable(): ParseTable<NT, T> {
        const grammar = this.getGrammar();
        const tablegen = new TableGenerator(grammar.goal, grammar.productions,
                                            grammar.NTs, grammar.Ts);
        return tablegen.genTable();
    }

    protected parseLines(lines: Line<T>[]): ParsedAssembly {
        const ctx = this.initCtx();

        for (const line of lines) {
            const parseTree = this.parser.parse(line);
            this.parseLine(ctx, parseTree, line);
        }

        return this.finish(ctx);
    }

    protected abstract getTable(): ParseTable<NT, T>;
    protected abstract getGrammar(): Grammar<NT, T>;
    protected abstract initCtx(): Ctx;
    protected abstract parseLine(ctx: Ctx, parseTree: ParseTree<NT, T>,
                                 line: Line<T>): void;
    protected abstract finish(ctx: Ctx): ParsedAssembly;
}

export { Parser, AbstractParser, ParsedAssembly, Section, Instruction,
         RegisterOperand, IntegerOperand, LabelOperand, PseudoOp,
         StringOperand, Line };
