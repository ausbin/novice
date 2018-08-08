import { Readable } from 'stream';
import { Scanner } from './scanner';

describe('scanner', () => {
    let scanner: Scanner;

    beforeEach(() => {
        scanner = new Scanner();
    });

    it('handles empty input', () => {
        let fp = new Readable();
        fp.push(null);

        expect(scanner.scan(fp)).toEqual([]);
    });

    it('scans instruction', () => {
        let fp = new Readable();
        fp.push('   halt');
        fp.push(null);

        expect(scanner.scan(fp)).toEqual([['halt']]);
    });

    it('scans assembler directive', () => {
        let fp = new Readable();
        fp.push('.fill 420');
        fp.push(null);

        expect(scanner.scan(fp)).toEqual([['.fill', '420']]);
    });

    it('ignores comments', () => {
        let fp = new Readable();
        fp.push('; a comment\n');
        fp.push('not r0, r0 ; hi kids\n');
        fp.push(null);

        expect(scanner.scan(fp)).toEqual([
            ['not', 'r0', ',', 'r0']
        ]);
    });

    it('scans mini program', () => {
        let fp = new Readable();
        fp.push('.orig x3000\n');
        fp.push('add r1, r1, r2\n');
        fp.push('.end');
        fp.push(null);

        expect(scanner.scan(fp)).toEqual([
            ['.orig', 'x3000'],
            ['add', 'r1', ',', 'r1', ',', 'r2'],
            ['.end']
        ]);
    });

    it('scans labels', () => {
        let fp = new Readable();
        fp.push('bob:\n');
        fp.push('goto bob\n');
        fp.push(null);

        expect(scanner.scan(fp)).toEqual([
            ['bob:'],
            ['goto', 'bob']
        ]);
    });
});
