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
            expect(lines).toEqual([['add', 'r0', ',', 'r0', ',', 'r1']]);
        });
    });

    it('scans assembler directive', () => {
        fp.push('.fill 420');
        fp.push(null);

        expect.hasAssertions();
        return new Scanner(fp).scan().then(lines => {
            expect(lines).toEqual([['.fill', '420']]);
        });
    });

    it('scans hex', () => {
        fp.push('trap x69');
        fp.push(null);

        expect.hasAssertions();
        return new Scanner(fp).scan().then(lines => {
            expect(lines).toEqual([['trap', 'x69']]);
        });
    });

    it('ignores comment', () => {
        fp.push('; a comment\n');
        fp.push('not r0, r0 ; hi kids\n');
        fp.push(null);

        expect.hasAssertions();
        return new Scanner(fp).scan().then(lines => {
            expect(lines).toEqual([['not', 'r0', ',', 'r0']]);
        });
    });

    it('scans mini program', () => {
        fp.push('.orig x3000\n');
        fp.push('add r1, r1, r2\n');
        fp.push('.end');
        fp.push(null);

        expect.hasAssertions();
        return new Scanner(fp).scan().then(lines => {
            expect(lines).toEqual([
                ['.orig', 'x3000'],
                ['add', 'r1', ',', 'r1', ',', 'r2'],
                ['.end']
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
                ['bob:'],
                ['goto', 'bob'],
            ]);
        });
    });

    it('scans string', () => {
        fp.push('.stringz "hi\\npatrick"');
        fp.push(null);

        expect.hasAssertions();
        return new Scanner(fp).scan().then(lines => {
            expect(lines).toEqual([['.stringz', '"hi\\npatrick"']]);
        });
    });

    it('scans character', () => {
        fp.push(".fill   '\\n'");
        fp.push(null);

        expect.hasAssertions();
        return new Scanner(fp).scan().then(lines => {
            expect(lines).toEqual([['.fill', "'\\n'"]]);
        });
    });
});
