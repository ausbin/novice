import { Assembly } from '../../isa';
import { AbstractParser, Parser } from './parser';
import { Grammar } from './grammar';
import { ParseTable, ParseTree } from '../lr1';
import { Line } from '../scanner';

jest.mock('../lr1');
import { TableGenerator } from '../lr1';

describe('abstract parser', () => {
    describe('genTable()', () => {
        // Bogus types
        type NT = 'goal';
        type T = '!';
        interface Context {};

        let parser: Parser;
        // @ts-ignore
        const mockGrammar: Grammar<NT, T> = {NTs: 'aveni', Ts: '1332',
                                             // @ts-ignore
                                             productions: 'j', goal: 'timothy',
                                             getDFAs: () => []};
        // @ts-ignore
        const mockTableGenerated: ParseTable<NT, T> = {table: 'hi dad'};
        const mockGenTable = jest.fn();

        class TestParser extends AbstractParser<Context, NT, T> {
            // @ts-ignore
            protected getTable(): ParseTable<NT, T> { return null; }
            // @ts-ignore
            protected getGrammar(): ParseTable<NT, T> { return mockGrammar; }
            protected initCtx(): Context { return {}; }
            protected parseLine(ctx: Context, parseTree: ParseTree<NT, T>, line: Line<T>): void {}
            // @ts-ignore
            protected finishParse(ctx: Context): Assembly { return null; }
        }

        beforeEach(() => {
            // @ts-ignore
            TableGenerator.mockImplementation(() => { 
                return { genTable: mockGenTable };
            });
            mockGenTable.mockReturnValue(mockTableGenerated);

            parser = new TestParser(null);
        });

        afterEach(() => {
            // @ts-ignore
            TableGenerator.mockReset();
            mockGenTable.mockReset();
        });

        it('generates a parse table', () => {
            expect(parser.genTable()).toEqual(mockTableGenerated);
            // @ts-ignore
            expect(TableGenerator.mock.calls).toEqual([['timothy', 'j', 'aveni', '1332']]);
            expect(mockGenTable.mock.calls).toEqual([[]]);
        });
    });
});
