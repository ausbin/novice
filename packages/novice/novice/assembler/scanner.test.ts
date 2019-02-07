import { Readable } from 'stream';
import { CommentDFA, IntegerDFA, PseudoOpDFA, RegDFA, StringDFA, SymbolDFA,
         WhitespaceDFA, WordDFA } from './dfa';
import { Scanner } from './scanner';

type T = 'decimal'|'hex'|'register'|'pseudo-op'|'str'|'chr'|'word'
         |'('|')'|','|':';

describe('scanner', () => {
    let scanner: Scanner<T>;
    let fp: Readable;

    beforeEach(() => {
        scanner = new Scanner<T>([
            new CommentDFA<T>(['!']),
            new IntegerDFA<T>({hex: 'hex', dec: 'decimal'}),
            new PseudoOpDFA<T>({pseudoOp: 'pseudo-op'}),
            new RegDFA<T>({reg: 'register'}, ['$']),
            new StringDFA<T>({string: 'str', char: 'chr'}),
            new SymbolDFA<T>(['(', ')', ',', ':']),
            new WhitespaceDFA<T>(),
            new WordDFA<T>({word: 'word'}),
        ]);
        fp = new Readable();
    });

    it('handles empty input', () => {
        fp.push(null);

        expect.hasAssertions();
        return scanner.scan(fp).then(lines => {
            expect(lines).toEqual([]);
        });
    });

    it('scans instruction', () => {
        fp.push('   add $0, $0, $1  ');
        fp.push(null);

        expect.hasAssertions();
        return scanner.scan(fp).then(lines => {
            expect(lines).toEqual([
                {num: 1, tokens: [
                    {col: 4,  val: 'add', kind: 'word'},
                    {col: 8,  val: '$0',  kind: 'register'},
                    {col: 10, val: ',',   kind: ','},
                    {col: 12, val: '$0',  kind: 'register'},
                    {col: 14, val: ',',   kind: ','},
                    {col: 16, val: '$1',  kind: 'register'},
                ]},
            ]);
        });
    });

    it('scans assembler directive', () => {
        fp.push('.fill 420');
        fp.push(null);

        expect.hasAssertions();
        return scanner.scan(fp).then(lines => {
            expect(lines).toEqual([
                {num: 1, tokens: [
                    {col: 1, val: '.fill', kind: 'pseudo-op'},
                    {col: 7, val: '420',   kind: 'decimal'},
                ]},
            ]);
        });
    });

    it('scans hex', () => {
        fp.push('trap 0x69');
        fp.push(null);

        expect.hasAssertions();
        return scanner.scan(fp).then(lines => {
            expect(lines).toEqual([
                {num: 1, tokens: [
                    {col: 1, val: 'trap', kind: 'word'},
                    {col: 6, val: '0x69',  kind: 'hex'},
                ]},
            ]);
        });
    });

    it('ignores comment', () => {
        fp.push('! a comment\n');
        fp.push('not $0, $0 ! hi kids\n');
        fp.push(null);

        expect.hasAssertions();
        return scanner.scan(fp).then(lines => {
            expect(lines).toEqual([
                {num: 2, tokens: [
                    {col: 1, val: 'not', kind: 'word'},
                    {col: 5, val: '$0',  kind: 'register'},
                    {col: 7, val: ',',   kind: ','},
                    {col: 9, val: '$0',  kind: 'register'},
                ]},
            ]);
        });
    });

    it('scans mini program', () => {
        fp.push('.orig 0x3000\r\n');
        fp.push('add $1, $1, $2\n');
        fp.push('.end');
        fp.push(null);

        expect.hasAssertions();
        return scanner.scan(fp).then(lines => {
            expect(lines).toEqual([
                {num: 1, tokens: [
                    {col: 1, val: '.orig',  kind: 'pseudo-op'},
                    {col: 7, val: '0x3000', kind: 'hex'},
                ]},
                {num: 2, tokens: [
                    {col: 1,  val: 'add',   kind: 'word'},
                    {col: 5,  val: '$1',    kind: 'register'},
                    {col: 7,  val: ',',     kind: ','},
                    {col: 9,  val: '$1',    kind: 'register'},
                    {col: 11, val: ',',     kind: ','},
                    {col: 13, val: '$2',    kind: 'register'},
                ]},
                {num: 3, tokens: [
                    {col: 1, val: '.end',   kind: 'pseudo-op'},
                ]},
            ]);
        });
    });

    it('scans label', () => {
        fp.push('bob:\n');
        fp.push('goto bob\n');
        fp.push(null);

        expect.hasAssertions();
        return scanner.scan(fp).then(lines => {
            expect(lines).toEqual([
                {num: 1, tokens: [
                    {col: 1, val: 'bob',  kind: 'word'},
                    {col: 4, val: ':',    kind: ':'},
                ]},
                {num: 2, tokens: [
                    {col: 1, val: 'goto', kind: 'word'},
                    {col: 6, val: 'bob',  kind: 'word'},
                ]},
            ]);
        });
    });

    it('scans string', () => {
        fp.push('.stringz "hi\\npatrick"');
        fp.push(null);

        expect.hasAssertions();
        return scanner.scan(fp).then(lines => {
            expect(lines).toEqual([
                {num: 1, tokens: [
                    {col: 1,  val: '.stringz', kind: 'pseudo-op'},
                    {col: 10, val: '"hi\\npatrick"', kind: 'str'},
                ]},
            ]);
        });
    });

    it('scans character', () => {
        fp.push(".fill   '\\n'");
        fp.push(null);

        expect.hasAssertions();
        return scanner.scan(fp).then(lines => {
            expect(lines).toEqual([
                {num: 1, tokens: [
                    {col: 1, val: '.fill', kind: 'pseudo-op'},
                    {col: 9, val: "'\\n'", kind: 'chr'},
                ]},
            ]);
        });
    });

    it('scans escaped single quote', () => {
        fp.push(".fill '\\''");
        fp.push(null);

        expect.hasAssertions();
        return scanner.scan(fp).then(lines => {
            expect(lines).toEqual([
                {num: 1, tokens: [
                    {col: 1, val: '.fill', kind: 'pseudo-op'},
                    {col: 7, val: "'\\''", kind: 'chr'},
                ]},
            ]);
        });
    });

    it('handles weird chars', () => {
        fp.push("add $1, $1, $2\n");
        fp.push("    ^ banana");
        fp.push(null);

        expect.hasAssertions();
        return scanner.scan(fp).catch(err => {
            expect(err.message).toContain('line 2');
            expect(err.message).toContain('column 5');
        });
    });
});
