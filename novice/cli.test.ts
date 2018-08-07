import { Writable } from 'stream';
import main from './cli';

describe('cli', () => {
    let stderr;
    let stderrActual;

    beforeEach(() => {
        stderrActual = "";
        stderr = new Writable({
            write(str) {
                stderrActual += str;
            }
        });
    });

    it('prints usage with no args', () => {
        expect(main([], stderr)).toEqual(1);
        expect(stderrActual).toContain('usage');
    });

    it('prints usage with missing asm args', () => {
        expect(main(['asm'], stderr)).toEqual(1);
        expect(stderrActual).toContain('usage');
    });

    it('assembles asm file', () => {
        expect(main(['asm', 'bob.asm'], stderr)).toEqual(0);
        expect(stderrActual).toContain('bob.asm');
    });
});
