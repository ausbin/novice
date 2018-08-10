import { Readable } from 'stream';
import { Scanner } from './scanner';

describe('scanner', () => {
    let fp: Readable;

    beforeEach(() => {
        fp = new Readable();
    });

    it('handles empty input', () => {
        fp.push(null);

        expect.hasAssertions();
        return new Scanner(fp).scan().then(lines => {
            expect(lines).toEqual([]);
        });
    });

    it('scans instruction', () => {
        fp.push('   add r0, r0, r1  ');
        fp.push(null);

        expect.hasAssertions();
        return new Scanner(fp).scan().then(lines => {
            expect(lines).toEqual([
                {num: 1, tokens: [
                    {col: 4,  val: 'add', kind: 'word'},
                    {col: 8,  val: 'r0',  kind: 'reg'},
                    {col: 10, val: ',',   kind: ','},
                    {col: 12, val: 'r0',  kind: 'reg'},
                    {col: 14, val: ',',   kind: ','},
                    {col: 16, val: 'r1',  kind: 'reg'},
                ]},
            ]);
        });
    });

    it('scans assembler directive', () => {
        fp.push('.fill 420');
        fp.push(null);

        expect.hasAssertions();
        return new Scanner(fp).scan().then(lines => {
            expect(lines).toEqual([
                {num: 1, tokens: [
                    {col: 1, val: '.fill', kind: 'pseudoop'},
                    {col: 7, val: '420',   kind: 'int-decimal'},
                ]},
            ]);
        });
    });

    it('scans hex', () => {
        fp.push('trap x69');
        fp.push(null);

        expect.hasAssertions();
        return new Scanner(fp).scan().then(lines => {
            expect(lines).toEqual([
                {num: 1, tokens: [
                    {col: 1, val: 'trap', kind: 'word'},
                    {col: 6, val: 'x69',  kind: 'int-hex'},
                ]},
            ]);
        });
    });

    it('ignores comment', () => {
        fp.push('; a comment\n');
        fp.push('not r0, r0 ; hi kids\n');
        fp.push(null);

        expect.hasAssertions();
        return new Scanner(fp).scan().then(lines => {
            expect(lines).toEqual([
                {num: 2, tokens: [
                    {col: 1, val: 'not', kind: 'word'},
                    {col: 5, val: 'r0',  kind: 'reg'},
                    {col: 7, val: ',',   kind: ','},
                    {col: 9, val: 'r0',  kind: 'reg'},
                ]},
            ]);
        });
    });

    it('scans mini program', () => {
        fp.push('.orig x3000\r\n');
        fp.push('add r1, r1, r2\n');
        fp.push('.end');
        fp.push(null);

        expect.hasAssertions();
        return new Scanner(fp).scan().then(lines => {
            expect(lines).toEqual([
                {num: 1, tokens: [
                    {col: 1, val: '.orig', kind: 'pseudoop'},
                    {col: 7, val: 'x3000', kind: 'int-hex'},
                ]},
                {num: 2, tokens: [
                    {col: 1,  val: 'add',  kind: 'word'},
                    {col: 5,  val: 'r1',   kind: 'reg'},
                    {col: 7,  val: ',',    kind: ','},
                    {col: 9,  val: 'r1',   kind: 'reg'},
                    {col: 11, val: ',',    kind: ','},
                    {col: 13, val: 'r2',   kind: 'reg'},
                ]},
                {num: 3, tokens: [
                    {col: 1, val: '.end',  kind: 'pseudoop'},
                ]},
            ]);
        });
    });

    it('scans label', () => {
        fp.push('bob:\n');
        fp.push('goto bob\n');
        fp.push(null);

        expect.hasAssertions();
        return new Scanner(fp).scan().then(lines => {
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
        return new Scanner(fp).scan().then(lines => {
            expect(lines).toEqual([
                {num: 1, tokens: [
                    {col: 1,  val: '.stringz', kind: 'pseudoop'},
                    {col: 10, val: '"hi\\npatrick"', kind: 'string'},
                ]},
            ]);
        });
    });

    it('scans character', () => {
        fp.push(".fill   '\\n'");
        fp.push(null);

        expect.hasAssertions();
        return new Scanner(fp).scan().then(lines => {
            expect(lines).toEqual([
                {num: 1, tokens: [
                    {col: 1, val: '.fill', kind: 'pseudoop'},
                    {col: 9, val: "'\\n'", kind: 'char'},
                ]},
            ]);
        });
    });

    it('handles weird chars', () => {
        fp.push("add r1, r1, r2\n");
        fp.push("    ^ banana");
        fp.push(null);

        expect.hasAssertions();
        return new Scanner(fp).scan().catch(err => {
            expect(err.message).toContain('line 2');
            expect(err.message).toContain('column 5');
        });
    });
});
