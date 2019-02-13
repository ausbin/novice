import { Assembly, Isa } from '../../isa';
import { Parser as LR1Parser, ParseTable, ParseTree,
         TableGenerator } from '../lr1';
import { Line, Scanner, Token } from '../scanner';
import { Grammar } from './grammar';

interface Parser {
    feedChars(buf: string): void;
    finish(): Assembly;
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

    public feedChars(buf: string): void {
        this.scanner.feedChars(buf);
    }

    public finish(): Assembly {
        return this.parseLines(this.scanner.finish());
    }

    public genTable(): ParseTable<NT, T> {
        const grammar = this.getGrammar();
        const tablegen = new TableGenerator(grammar.goal, grammar.productions,
                                            grammar.NTs, grammar.Ts);
        return tablegen.genTable();
    }

    protected parseLines(lines: Line<T>[]): Assembly {
        const ctx = this.initCtx();

        for (const line of lines) {
            const parseTree = this.parser.parse(line);
            this.parseLine(ctx, parseTree, line);
        }

        return this.finishParse(ctx);
    }

    protected abstract getTable(): ParseTable<NT, T>;
    protected abstract getGrammar(): Grammar<NT, T>;
    protected abstract initCtx(): Ctx;
    protected abstract parseLine(ctx: Ctx, parseTree: ParseTree<NT, T>,
                                 line: Line<T>): void;
    protected abstract finishParse(ctx: Ctx): Assembly;
}

export { Parser, AbstractParser, Line };
