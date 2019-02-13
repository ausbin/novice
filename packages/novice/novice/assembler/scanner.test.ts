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
        expect(scanner.finish()).toEqual([]);
    });

    it('scans instruction', () => {
        scanner.feedChars('   add $0, $0, $1  ');

        expect(scanner.finish()).toEqual([
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

    it('scans assembler directive', () => {
        scanner.feedChars('.fill 420');

        expect(scanner.finish()).toEqual([
            {num: 1, tokens: [
                {col: 1, val: '.fill', kind: 'pseudo-op'},
                {col: 7, val: '420',   kind: 'decimal'},
            ]},
        ]);
    });

    it('scans hex', () => {
        scanner.feedChars('trap 0x69');

        expect(scanner.finish()).toEqual([
            {num: 1, tokens: [
                {col: 1, val: 'trap', kind: 'word'},
                {col: 6, val: '0x69',  kind: 'hex'},
            ]},
        ]);
    });

    it('ignores comment', () => {
        scanner.feedChars('! a comment\n');
        scanner.feedChars('not $0, $0 ! hi kids\n');

        expect(scanner.finish()).toEqual([
            {num: 2, tokens: [
                {col: 1, val: 'not', kind: 'word'},
                {col: 5, val: '$0',  kind: 'register'},
                {col: 7, val: ',',   kind: ','},
                {col: 9, val: '$0',  kind: 'register'},
            ]},
        ]);
    });

    it('scans mini program', () => {
        scanner.feedChars('.orig 0x3000\r\n');
        scanner.feedChars('add $1, $1, $2\n');
        scanner.feedChars('.end');

        expect(scanner.finish()).toEqual([
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

    it('scans label', () => {
        scanner.feedChars('bob:\n');
        scanner.feedChars('goto bob\n');

        expect(scanner.finish()).toEqual([
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

    it('scans string', () => {
        scanner.feedChars('.stringz "hi\\npatrick"');

        expect(scanner.finish()).toEqual([
            {num: 1, tokens: [
                {col: 1,  val: '.stringz', kind: 'pseudo-op'},
                {col: 10, val: '"hi\\npatrick"', kind: 'str'},
            ]},
        ]);
    });

    it('scans character', () => {
        scanner.feedChars(".fill   '\\n'");

        expect(scanner.finish()).toEqual([
            {num: 1, tokens: [
                {col: 1, val: '.fill', kind: 'pseudo-op'},
                {col: 9, val: "'\\n'", kind: 'chr'},
            ]},
        ]);
    });

    it('scans escaped single quote', () => {
        scanner.feedChars(".fill '\\''");

        expect(scanner.finish()).toEqual([
            {num: 1, tokens: [
                {col: 1, val: '.fill', kind: 'pseudo-op'},
                {col: 7, val: "'\\''", kind: 'chr'},
            ]},
        ]);
    });

    it('handles weird chars', () => {
        expect(() => {
            scanner.feedChars("add $1, $1, $2\n");
            scanner.feedChars("    ^ banana");
            scanner.finish();
        }).toThrow(/line 2 .*column 5/);
    });
});
