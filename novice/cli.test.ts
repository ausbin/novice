import { Readable, Writable } from 'stream';
import main from './cli';
import { Parser } from './assembler/parsers';

// Mocks
jest.mock('fs');
import * as fs from 'fs';
jest.mock('./assembler');
import { Assembler, getParser } from './assembler';

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
        Assembler.mockReset();
        // @ts-ignore
        getParser.mockReset();
    });

    it('prints usage with no args', () => {
        return main([], stdout, stderr).then(exitCode => {
            expect(exitCode).toEqual(1);
            expect(stdoutActual).toEqual('');
            expect(stderrActual).toContain('usage');
        });
    });

    describe('asm-pass1 subcommand', () => {
        it('prints usage with missing args', () => {
            return main(['asm-pass1'], stdout, stderr).then(exitCode => {
                expect(exitCode).toEqual(1);
                expect(stdoutActual).toEqual('');
                expect(stderrActual).toContain('usage');
            });
        });

        it('parses asm file', () => {
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
            let mockParse = jest.fn((fp: Readable) => Promise.resolve(json));
            // @ts-ignore
            Assembler.mockImplementation((parser: Parser) => {
                return { parse: mockParse };
            });
            // @ts-ignore
            let mockParser: Parser = {thanku: 'next'};
            // @ts-ignore
            getParser.mockImplementation((parserName: string) => {
                return mockParser;
            });

            return main(['asm-pass1', 'pasta', 'patrick.asm'],
                        stdout, stderr).then(exitCode => {
                // @ts-ignore
                expect(fs.createReadStream.mock.calls).toEqual([['patrick.asm']]);
                // @ts-ignore
                expect(getParser.mock.calls).toEqual([['pasta']]);
                // @ts-ignore
                expect(Assembler.mock.calls).toEqual([[mockParser]]);
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

            return main(['asm-pass1', 'pizza', 'sanjay.asm'],
                        stdout, stderr).then(exitCode => {
                // @ts-ignore
                expect(fs.createReadStream.mock.calls).toEqual([['sanjay.asm']]);

                expect(exitCode).toEqual(1);
                expect(stdoutActual).toEqual('');
                expect(stderrActual).toContain('wow bad');
            });
        });
    });

    describe('tablegen subcommand', () => {
        it('prints usage with no args', () => {
            return main(['tablegen'], stdout, stderr).then(exitCode => {
                expect(exitCode).toEqual(1);
                expect(stdoutActual).toEqual('');
                expect(stderrActual).toContain('usage');
            });
        });

        it('prints usage with extra args', () => {
            return main(['tablegen', 'big', 'daddy'], stdout, stderr).then(exitCode => {
                expect(exitCode).toEqual(1);
                expect(stdoutActual).toEqual('');
                expect(stderrActual).toContain('usage');
            });
        });

        it('generates table', () => {
            const json = {massive: 'banana'};
            const mockGenTable = jest.fn(() => json);
            // @ts-ignore
            const mockParser: Parser = {genTable: mockGenTable};

            // @ts-ignore
            getParser.mockReturnValue(mockParser);

            return main(['tablegen', 'farzam'],
                        stdout, stderr).then(exitCode => {
                // @ts-ignore
                expect(getParser.mock.calls).toEqual([['farzam']]);
                expect(mockGenTable.mock.calls).toEqual([[]]);

                expect(exitCode).toEqual(0);
                expect(stdoutActual).toEqual(JSON.stringify(json));
                expect(stderrActual).toEqual('');
            });
        });

        it('handles invalid parsers', () => {
            // @ts-ignore
            getParser.mockImplementation(() => {throw new Error('excuse me son')});

            return main(['tablegen', 'gucci'], stdout, stderr).then(exitCode => {
                // @ts-ignore
                expect(getParser.mock.calls).toEqual([['gucci']]);

                expect(exitCode).toEqual(1);
                expect(stdoutActual).toEqual('');
                expect(stderrActual).toContain('excuse me son');
            });
        });

        it('handles conflicts', () => {
            const mockGenTable = jest.fn(() => {throw new Error('big bad conflict!')});
            // @ts-ignore
            const mockParser: Parser = {genTable: mockGenTable};

            // @ts-ignore
            getParser.mockReturnValue(mockParser);

            return main(['tablegen', 'guwop'], stdout, stderr).then(exitCode => {
                // @ts-ignore
                expect(getParser.mock.calls).toEqual([['guwop']]);

                expect(exitCode).toEqual(1);
                expect(stdoutActual).toEqual('');
                expect(stderrActual).toContain('big bad conflict!');
            });
        });
    });
});
