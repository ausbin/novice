import { Readable, Writable } from 'stream';
import main from './cli';

// Mocks
jest.mock('fs');
import * as fs from 'fs';
jest.mock('./assembler');
import * as assembler from './assembler';

describe('cli', () => {
    let stdout: Writable, stderr: Writable;
    let stdoutActual: string, stderrActual: string;

    beforeEach(() => {
        stdoutActual = stderrActual = "";
        stdout = new Writable({
            write(str) {
                stdoutActual += str;
            }
        });
        stderr = new Writable({
            write(str) {
                stderrActual += str;
            }
        });

    });

    afterEach(() => {
        // @ts-ignore
        fs.createReadStream.mockReset();
        // @ts-ignore
        assembler.Assembler.mockReset();
    });

    it('prints usage with no args', () => {
        return main([], stdout, stderr).then(exitCode => {
            expect(exitCode).toEqual(1);
            expect(stdoutActual).toEqual('');
            expect(stderrActual).toContain('usage');
        });
    });

    it('prints usage with missing asm args', () => {
        return main(['asm'], stdout, stderr).then(exitCode => {
            expect(exitCode).toEqual(1);
            expect(stdoutActual).toEqual('');
            expect(stderrActual).toContain('usage');
        });
    });

    it('assembles asm file', () => {
        let mockFp = {
            on(event: string, handler: () => void) {
                if (event === 'readable') {
                    handler();
                }
            }
        };
        // @ts-ignore
        fs.createReadStream.mockReturnValue(mockFp);

        let json = {kush: 'coma'};
        let mockParse = jest.fn(() => Promise.resolve(json));
        // @ts-ignore
        assembler.Assembler.mockImplementation(() => {
            return { parse: mockParse };
        });

        return main(['asm', 'patrick.asm'], stdout, stderr).then(exitCode => {
            // @ts-ignore
            expect(fs.createReadStream.mock.calls).toEqual([['patrick.asm']]);
            expect(mockParse.mock.calls).toEqual([[mockFp]]);

            expect(exitCode).toEqual(0);
            expect(stdoutActual).toEqual(JSON.stringify(json));
            expect(stderrActual).toEqual('');
        });
    });

    it('handles nonexistent file', () => {
        let mockFp = {
            on(event: string, handler: (reason: any) => void) {
                if (event === 'error') {
                    handler(new Error('wow bad'));
                }
            }
        };
        // @ts-ignore
        fs.createReadStream.mockReturnValue(mockFp);

        return main(['asm', 'sanjay.asm'], stdout, stderr).then(exitCode => {
            // @ts-ignore
            expect(fs.createReadStream.mock.calls).toEqual([['sanjay.asm']]);

            expect(exitCode).toEqual(1);
            expect(stdoutActual).toEqual('');
            expect(stderrActual).toContain('wow bad');
        });
    });
});
