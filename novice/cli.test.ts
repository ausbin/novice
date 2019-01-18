import { Readable, Writable } from 'stream';
import { Buffer } from 'buffer';
import { getIsa } from './isa';
import main from './cli';

// Mocks
jest.mock('fs');
import * as fs from 'fs';
jest.mock('./assembler');
import { Assembler, AssemblerConfig, getConfig, getParser } from './assembler';

describe('cli', () => {
    let stdin: Readable, stdout: Writable, stderr: Writable;
    let stdinActual: string, stdoutActual: string, stderrActual: string;

    beforeEach(() => {
        stdinActual = stdoutActual = stderrActual = "";
        stdin = new Readable({
            read(n) {
                n = Math.min(n, stdinActual.length);
                if (!n) {
                    return null;
                } else {
                    const res = Buffer.from(stdinActual.slice(0, n));
                    stdinActual = stdinActual.slice(n);
                    return res;
                }
            }
        });
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
        fs.createWriteStream.mockReset();
        // @ts-ignore
        Assembler.mockReset();
        // @ts-ignore
        getConfig.mockReset();
        // @ts-ignore
        getParser.mockReset();
    });

    describe('asm subcommand', () => {
        let mockInFp: Readable;
        let mockOutFp: Writable;
        let mockAssembleTo: (inFp: Readable, outFp: Writable) => Promise<void>;
        let mockConfig: AssemblerConfig;

        beforeEach(() => {
            // @ts-ignore
            mockInFp = {
                // @ts-ignore
                on(event: string, handler: () => void) {
                    if (event === 'readable') {
                        handler();
                    }
                }
            };
            // @ts-ignore
            fs.createReadStream.mockReturnValue(mockInFp);

            // @ts-ignore
            mockOutFp = {
                cork: () => {},
                uncork: () => {},
                end: () => {},
            };
            // @ts-ignore
            fs.createWriteStream.mockReturnValue(mockOutFp);

            // @ts-ignore
            mockAssembleTo = jest.fn((inFp: Readable, outFp: Writable) => Promise.resolve());
            // @ts-ignore
            Assembler.mockImplementation((cfg: AssemblerConfig) => {
                return { assembleTo: mockAssembleTo };
            });
            // @ts-ignore
            mockConfig = {
                // @ts-ignore
                serializer: {
                    fileExt: () => 'star',
                },
            };
            // @ts-ignore
            getConfig.mockReturnValue(mockConfig);
        });

        it('parses asm file', () => {
            return main(['asm', '-c', 'bread', 'patrick.asm'],
                        stdin, stdout, stderr).then(exitCode => {
                // @ts-ignore
                expect(fs.createReadStream.mock.calls).toEqual([['patrick.asm']]);
                // @ts-ignore
                expect(fs.createWriteStream.mock.calls).toEqual([['patrick.star']]);
                // @ts-ignore
                expect(getConfig.mock.calls).toEqual([['bread']]);
                // @ts-ignore
                expect(Assembler.mock.calls).toEqual([[mockConfig]]);
                // @ts-ignore
                expect(mockAssembleTo.mock.calls).toEqual([[mockInFp, mockOutFp]]);

                expect(exitCode).toEqual(0);
                expect(stdoutActual).toEqual('');
                expect(stderrActual).toEqual('');
            });
        });

        it('handles nonexistent file', () => {
            // @ts-ignore
            mockInFp.on = (event: string, handler: (reason: any) => void) => {
                if (event === 'error') {
                    handler(new Error('wow bad'));
                }
            };

            return main(['asm', 'sanjay.asm'],
                        stdin, stdout, stderr).then(exitCode => {
                // @ts-ignore
                expect(fs.createReadStream.mock.calls).toEqual([['sanjay.asm']]);

                expect(exitCode).toEqual(1);
                expect(stdoutActual).toEqual('');
                expect(stderrActual).toContain('wow bad');
            });
        });
    });

    describe('tablegen subcommand', () => {
        it('generates table', () => {
            const json = {massive: 'banana'};
            const mockGenTable = jest.fn(() => json);
            // @ts-ignore
            const mockParser: Parser = {genTable: mockGenTable};

            // @ts-ignore
            getParser.mockReturnValue(mockParser);

            return main(['tablegen', 'farzam'],
                        stdin, stdout, stderr).then(exitCode => {
                // @ts-ignore
                expect(getParser.mock.calls).toEqual([['farzam', getIsa('dummy')]]);
                expect(mockGenTable.mock.calls).toEqual([[]]);

                expect(exitCode).toEqual(0);
                expect(stdoutActual).toEqual(JSON.stringify(json));
                expect(stderrActual).toEqual('');
            });
        });

        it('handles invalid parsers', () => {
            // @ts-ignore
            getParser.mockImplementation(() => {throw new Error('excuse me son')});

            return main(['tablegen', 'gucci'],
                        stdin, stdout, stderr).then(exitCode => {
                // @ts-ignore
                expect(getParser.mock.calls).toEqual([['gucci', getIsa('dummy')]]);

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

            return main(['tablegen', 'guwop'],
                        stdin, stdout, stderr).then(exitCode => {
                // @ts-ignore
                expect(getParser.mock.calls).toEqual([['guwop', getIsa('dummy')]]);

                expect(exitCode).toEqual(1);
                expect(stdoutActual).toEqual('');
                expect(stderrActual).toContain('big bad conflict!');
            });
        });
    });
});
