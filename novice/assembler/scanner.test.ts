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
                    {col: 4,  val: 'add'},
                    {col: 8,  val: 'r0'},
                    {col: 10, val: ','},
                    {col: 12, val: 'r0'},
                    {col: 14, val: ','},
                    {col: 16, val: 'r1'},
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
                    {col: 1, val: '.fill'},
                    {col: 7, val: '420'},
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
                    {col: 1, val: 'trap'},
                    {col: 6, val: 'x69'},
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
                    {col: 1, val: 'not'},
                    {col: 5, val: 'r0'},
                    {col: 7, val: ','},
                    {col: 9, val: 'r0'},
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
                    {col: 1, val: '.orig'},
                    {col: 7, val: 'x3000'},
                ]},
                {num: 2, tokens: [
                    {col: 1,  val: 'add'},
                    {col: 5,  val: 'r1'},
                    {col: 7,  val: ','},
                    {col: 9,  val: 'r1'},
                    {col: 11, val: ','},
                    {col: 13, val: 'r2'},
                ]},
                {num: 3, tokens: [
                    {col: 1, val: '.end'},
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
                    {col: 1, val: 'bob:'},
                ]},
                {num: 2, tokens: [
                    {col: 1, val: 'goto'},
                    {col: 6, val: 'bob'},
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
                    {col: 1,  val: '.stringz'},
                    {col: 10, val: '"hi\\npatrick"'},
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
                    {col: 1, val: '.fill'},
                    {col: 9, val: "'\\n'"},
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
