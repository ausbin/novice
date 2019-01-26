import { Readable, Writable } from 'stream';
import { Buffer } from 'buffer';
import main from './cli';

// Mocks
jest.mock('fs');
import * as fs from 'fs';
jest.mock('./assembler');
import { Assembler, AssemblerConfig, Serializer, getConfig, getParser,
         getSerializer } from './assembler';
jest.mock('./simulator');
import { CliDebugger, getSimulatorConfig, Simulator,
         SimulatorConfig } from './simulator';
jest.mock('./isa');
import { getIsa, StreamIO } from './isa';

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
            write(str, encoding, callback) {
                stdoutActual += str;
                if (callback) callback();
            }
        });
        stderr = new Writable({
            write(str, encoding, callback) {
                stderrActual += str;
                if (callback) callback();
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
        let mockSerializer: Serializer;

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

            // @ts-ignore
            mockSerializer = {fileExt: () => 'tl6'};
            // @ts-ignore
            getSerializer.mockReturnValue(mockSerializer);
        });

        it('assembles asm file', () => {
            return main(['asm', '-c', 'bread', 'patrick.asm'],
                        stdin, stdout, stderr).then(exitCode => {
                // @ts-ignore
                expect(fs.createReadStream.mock.calls).toEqual([['patrick.asm']]);
                // @ts-ignore
                expect(fs.createWriteStream.mock.calls).toEqual([['patrick.star']]);
                // @ts-ignore
                expect(getConfig.mock.calls).toEqual([['bread']]);
                // @ts-ignore
                expect(getSerializer.mock.calls).toEqual([]);
                // @ts-ignore
                expect(Assembler.mock.calls).toEqual([[mockConfig]]);
                // @ts-ignore
                expect(mockAssembleTo.mock.calls).toEqual([[mockInFp, mockOutFp]]);

                expect(exitCode).toEqual(0);
                expect(stdoutActual).toEqual('');
                expect(stderrActual).toEqual('');
            });
        });

        it('assembles asm file without extension', () => {
            return main(['asm', '-c', 'bread', 'chickenworld'],
                        stdin, stdout, stderr).then(exitCode => {
                // @ts-ignore
                expect(fs.createReadStream.mock.calls).toEqual([['chickenworld']]);
                // @ts-ignore
                expect(fs.createWriteStream.mock.calls).toEqual([['chickenworld.star']]);
                // @ts-ignore
                expect(getConfig.mock.calls).toEqual([['bread']]);
                // @ts-ignore
                expect(getSerializer.mock.calls).toEqual([]);
                // @ts-ignore
                expect(Assembler.mock.calls).toEqual([[mockConfig]]);
                // @ts-ignore
                expect(mockAssembleTo.mock.calls).toEqual([[mockInFp, mockOutFp]]);

                expect(exitCode).toEqual(0);
                expect(stdoutActual).toEqual('');
                expect(stderrActual).toEqual('');
            });
        });

        it('assembles asm file with period in earlier path components', () => {
            return main(['asm', '-c', 'bread', '/home/travis.adams/chickenworld'],
                        stdin, stdout, stderr).then(exitCode => {
                // @ts-ignore
                expect(fs.createReadStream.mock.calls).toEqual([['/home/travis.adams/chickenworld']]);
                // @ts-ignore
                expect(fs.createWriteStream.mock.calls).toEqual([['/home/travis.adams/chickenworld.star']]);
                // @ts-ignore
                expect(getConfig.mock.calls).toEqual([['bread']]);
                // @ts-ignore
                expect(getSerializer.mock.calls).toEqual([]);
                // @ts-ignore
                expect(Assembler.mock.calls).toEqual([[mockConfig]]);
                // @ts-ignore
                expect(mockAssembleTo.mock.calls).toEqual([[mockInFp, mockOutFp]]);

                expect(exitCode).toEqual(0);
                expect(stdoutActual).toEqual('');
                expect(stderrActual).toEqual('');
            });
        });

        it('assembles asm file with hardcoded out path', () => {
            return main(['asm', '-c', 'bread', 'chickenworld.asm', '-o', 'jeff'],
                        stdin, stdout, stderr).then(exitCode => {
                // @ts-ignore
                expect(fs.createReadStream.mock.calls).toEqual([['chickenworld.asm']]);
                // @ts-ignore
                expect(fs.createWriteStream.mock.calls).toEqual([['jeff']]);
                // @ts-ignore
                expect(getConfig.mock.calls).toEqual([['bread']]);
                // @ts-ignore
                expect(getSerializer.mock.calls).toEqual([]);
                // @ts-ignore
                expect(Assembler.mock.calls).toEqual([[mockConfig]]);
                // @ts-ignore
                expect(mockAssembleTo.mock.calls).toEqual([[mockInFp, mockOutFp]]);

                expect(exitCode).toEqual(0);
                expect(stdoutActual).toEqual('');
                expect(stderrActual).toEqual('');
            });
        });

        it('assembles asm file with lc3 config by default', () => {
            return main(['asm', 'chickenworld.asm'],
                        stdin, stdout, stderr).then(exitCode => {
                // @ts-ignore
                expect(fs.createReadStream.mock.calls).toEqual([['chickenworld.asm']]);
                // @ts-ignore
                expect(fs.createWriteStream.mock.calls).toEqual([['chickenworld.star']]);
                // @ts-ignore
                expect(getConfig.mock.calls).toEqual([['lc3']]);
                // @ts-ignore
                expect(getSerializer.mock.calls).toEqual([]);
                // @ts-ignore
                expect(Assembler.mock.calls).toEqual([[mockConfig]]);
                // @ts-ignore
                expect(mockAssembleTo.mock.calls).toEqual([[mockInFp, mockOutFp]]);

                expect(exitCode).toEqual(0);
                expect(stdoutActual).toEqual('');
                expect(stderrActual).toEqual('');
            });
        });

        it('assembles asm file with custom serializer', () => {
            return main(['asm', 'chickenworld.asm', '-f', 'honker'],
                        stdin, stdout, stderr).then(exitCode => {
                // @ts-ignore
                expect(fs.createReadStream.mock.calls).toEqual([['chickenworld.asm']]);
                // @ts-ignore
                expect(fs.createWriteStream.mock.calls).toEqual([['chickenworld.tl6']]);
                // @ts-ignore
                expect(getConfig.mock.calls).toEqual([['lc3']]);
                // @ts-ignore
                expect(getSerializer.mock.calls).toEqual([['honker']]);
                // @ts-ignore
                expect(Assembler.mock.calls).toEqual([[mockConfig]]);
                // @ts-ignore
                expect(mockAssembleTo.mock.calls).toEqual([[mockInFp, mockOutFp]]);

                expect(mockConfig.serializer).toBe(mockSerializer);

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

    describe('simulation', () => {
        let mockSimConfig: SimulatorConfig;
        let mockFp: Readable;

        beforeAll(() => {
            mockSimConfig = {
                // @ts-ignore
                isa: {donkey: 'horse apple'},
                loader: {
                    load: jest.fn(),
                },
            };
            // @ts-ignore
            mockFp = {
                iam: 'fp',
                // @ts-ignore
                on(ev, cb) {
                    if (ev === 'readable') cb();
                }
            };
        });

        beforeEach(() => {
            // @ts-ignore
            getSimulatorConfig.mockReturnValue(mockSimConfig);
            // @ts-ignore
            fs.createReadStream.mockReturnValue(mockFp);
        });

        afterEach(() => {
            // @ts-ignore
            getSimulatorConfig.mockReset();
            // @ts-ignore
            fs.createReadStream.mockReset();
            // @ts-ignore
            mockSimConfig.loader.load.mockReset();
        });

        describe('sim subcommand', () => {
            let mockStdin: Readable;
            let mockIo: StreamIO;
            let mockSim: Simulator;

            beforeAll(() => {
                // @ts-ignore
                mockStdin = {
                    iam: 'stdin',
                    // @ts-ignore
                    on(ev, cb) {
                        if (ev === 'readable') cb();
                    }
                };
                // @ts-ignore
                mockIo = {timothy: 'aveni'};
                // @ts-ignore
                mockSim = {
                    run: jest.fn(),
                };
            });

            beforeEach(() => {
                // @ts-ignore
                StreamIO.mockImplementation(() => mockIo);
                // @ts-ignore
                Simulator.mockImplementation(() => mockSim);
            });

            afterEach(() => {
                // @ts-ignore
                StreamIO.mockReset();
                // @ts-ignore
                Simulator.mockReset();
                // @ts-ignore
                mockSim.run.mockReset();
            });

            it('simulates', () => {
                return main(['sim', 'farzam.obj'],
                            mockStdin, stdout, stderr).then(exitCode => {
                    // @ts-ignore
                    expect(getSimulatorConfig.mock.calls).toEqual([['lc3']]);
                    // @ts-ignore
                    expect(fs.createReadStream.mock.calls).toEqual([['farzam.obj']]);
                    // @ts-ignore
                    expect(StreamIO.mock.calls).toEqual([[mockStdin, stdout]]);
                    // @ts-ignore
                    expect(Simulator.mock.calls).toEqual([[mockSimConfig.isa, mockIo]]);
                    // @ts-ignore
                    expect(mockSim.run.mock.calls).toEqual([[]]);

                    expect(exitCode).toEqual(0);
                    expect(stdoutActual).toEqual('');
                    expect(stderrActual).toEqual('');
                });
            });

            it('handles nonexistent file', () => {
                // @ts-ignore
                fs.createReadStream.mockReset();
                // @ts-ignore
                fs.createReadStream.mockReturnValue({
                    // @ts-ignore
                    on(ev, cb) {
                        if (ev === 'error') cb(new Error('oopsie daisy doodle'));
                    }
                });

                return main(['sim', 'margaret.obj'],
                            mockStdin, stdout, stderr).then(exitCode => {
                    // @ts-ignore
                    expect(fs.createReadStream.mock.calls).toEqual([['margaret.obj']]);
                    // @ts-ignore
                    expect(mockSim.run.mock.calls).toEqual([]);

                    expect(exitCode).toEqual(1);
                    expect(stdoutActual).toEqual('');
                    expect(stderrActual).toMatch('oopsie daisy doodle');
                });
            });
        });

        describe('dbg subcommand', () => {
            let mockDbg: CliDebugger;

            beforeAll(() => {
                // @ts-ignore
                mockDbg = {
                    run: jest.fn(),
                    close: jest.fn(),
                };
            });

            beforeEach(() => {
                // @ts-ignore
                CliDebugger.mockImplementation(() => mockDbg);
            });

            afterEach(() => {
                // @ts-ignore
                CliDebugger.mockReset();
                // @ts-ignore
                mockDbg.run.mockReset();
                // @ts-ignore
                mockDbg.close.mockReset();
            });

            it('launches debugger', () => {
                return main(['dbg', 'brickell.obj'],
                            stdin, stdout, stderr).then(exitCode => {
                    // @ts-ignore
                    expect(getSimulatorConfig.mock.calls).toEqual([['lc3']]);
                    // @ts-ignore
                    expect(fs.createReadStream.mock.calls).toEqual([['brickell.obj']]);
                    // @ts-ignore
                    expect(CliDebugger.mock.calls).toEqual([[mockSimConfig.isa, stdin, stdout]]);
                    // @ts-ignore
                    expect(mockDbg.run.mock.calls).toEqual([[]]);
                    // @ts-ignore
                    expect(mockDbg.close.mock.calls).toEqual([[]]);

                    expect(exitCode).toEqual(0);
                    expect(stdoutActual).toEqual('');
                    expect(stderrActual).toEqual('');
                });
            });

            it('handles setup error', () => {
                // @ts-ignore
                fs.createReadStream.mockReset();
                // @ts-ignore
                fs.createReadStream.mockReturnValue({
                    // @ts-ignore
                    on(ev, cb) {
                        if (ev === 'error') cb(new Error('oops i did it again'));
                    }
                });

                return main(['dbg', 'brickell.obj'],
                            stdin, stdout, stderr).then(exitCode => {
                    // @ts-ignore
                    expect(fs.createReadStream.mock.calls).toEqual([['brickell.obj']]);
                    // @ts-ignore
                    expect(CliDebugger.mock.calls).toEqual([]);

                    expect(exitCode).toEqual(1);
                    expect(stdoutActual).toEqual('');
                    expect(stderrActual).toMatch(/setup error.+oops i did it again/);
                });
            });

            it('handles simulator error', () => {
                // @ts-ignore
                mockDbg.run.mockReset();
                // @ts-ignore
                mockDbg.run.mockImplementation(() => {
                    throw new Error('unexpected end-of-file');
                });

                return main(['dbg', 'daisy.obj'],
                            stdin, stdout, stderr).then(exitCode => {
                    // @ts-ignore
                    expect(getSimulatorConfig.mock.calls).toEqual([['lc3']]);
                    // @ts-ignore
                    expect(fs.createReadStream.mock.calls).toEqual([['daisy.obj']]);
                    // @ts-ignore
                    expect(CliDebugger.mock.calls).toEqual([[mockSimConfig.isa, stdin, stdout]]);
                    // @ts-ignore
                    expect(mockDbg.run.mock.calls).toEqual([[]]);
                    // @ts-ignore
                    expect(mockDbg.close.mock.calls).toEqual([[]]);

                    expect(exitCode).toEqual(1);
                    expect(stdoutActual).toEqual('');
                    expect(stderrActual).toMatch('error: unexpected end-of-file');
                });
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
