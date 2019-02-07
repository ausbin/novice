import { Readable, Writable } from 'stream';
import { Buffer } from 'buffer';
import main from './cli';

// Mocks
jest.mock('fs');
import * as fs from 'fs';
jest.mock('novice');
import { Assembler, AssemblerConfig, Serializer, getConfig, getParser,
         getSerializer,
         CliDebugger, getSimulatorConfig, Simulator,
         SimulatorConfig,
         getIsa, StreamIO, SymbTable, MachineCodeSection } from 'novice';

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
        let mockSymbFp: Writable;
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
                // @ts-ignore
                whoami: 'out',
                cork: () => {},
                uncork: () => {},
                end: () => {},
            };
            // @ts-ignore
            fs.createWriteStream.mockReturnValueOnce(mockOutFp);

            // @ts-ignore
            mockSymbFp = {
                // @ts-ignore
                whoami: 'symb',
                cork: () => {},
                uncork: () => {},
                end: () => {},
            };
            // @ts-ignore
            fs.createWriteStream.mockReturnValueOnce(mockSymbFp);

            // @ts-ignore
            mockAssembleTo = jest.fn((inFp: Readable, outFp: Writable, symbFp: Writable) => Promise.resolve());
            // @ts-ignore
            Assembler.mockImplementation((cfg: AssemblerConfig) => {
                return { assembleTo: mockAssembleTo };
            });
            // @ts-ignore
            mockConfig = {
                // @ts-ignore
                serializer: {
                    fileExt: () => 'star',
                    symbFileExt: () => 'squidward',
                },
            };
            // @ts-ignore
            getConfig.mockReturnValue(mockConfig);

            // @ts-ignore
            mockSerializer = {
                fileExt: () => 'tl6',
                symbFileExt: () => 'anime'
            };
            // @ts-ignore
            getSerializer.mockReturnValue(mockSerializer);
        });

        it('assembles asm file', () => {
            return main(['asm', '-c', 'bread', 'patrick.asm'],
                        stdin, stdout, stderr).then(exitCode => {
                // @ts-ignore
                expect(fs.createReadStream.mock.calls).toEqual([['patrick.asm']]);
                // @ts-ignore
                expect(fs.createWriteStream.mock.calls).toEqual([['patrick.star'], ['patrick.squidward']]);
                // @ts-ignore
                expect(getConfig.mock.calls).toEqual([['bread']]);
                // @ts-ignore
                expect(getSerializer.mock.calls).toEqual([]);
                // @ts-ignore
                expect(Assembler.mock.calls).toEqual([[mockConfig]]);
                // @ts-ignore
                expect(mockAssembleTo.mock.calls).toEqual([[mockInFp, mockOutFp, mockSymbFp]]);

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
                expect(fs.createWriteStream.mock.calls).toEqual([['chickenworld.star'], ['chickenworld.squidward']]);
                // @ts-ignore
                expect(getConfig.mock.calls).toEqual([['bread']]);
                // @ts-ignore
                expect(getSerializer.mock.calls).toEqual([]);
                // @ts-ignore
                expect(Assembler.mock.calls).toEqual([[mockConfig]]);
                // @ts-ignore
                expect(mockAssembleTo.mock.calls).toEqual([[mockInFp, mockOutFp, mockSymbFp]]);

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
                expect(fs.createWriteStream.mock.calls).toEqual([['/home/travis.adams/chickenworld.star'], ['/home/travis.adams/chickenworld.squidward']]);
                // @ts-ignore
                expect(getConfig.mock.calls).toEqual([['bread']]);
                // @ts-ignore
                expect(getSerializer.mock.calls).toEqual([]);
                // @ts-ignore
                expect(Assembler.mock.calls).toEqual([[mockConfig]]);
                // @ts-ignore
                expect(mockAssembleTo.mock.calls).toEqual([[mockInFp, mockOutFp, mockSymbFp]]);

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
                expect(fs.createWriteStream.mock.calls).toEqual([['jeff'], ['jeff.squidward']]);
                // @ts-ignore
                expect(getConfig.mock.calls).toEqual([['bread']]);
                // @ts-ignore
                expect(getSerializer.mock.calls).toEqual([]);
                // @ts-ignore
                expect(Assembler.mock.calls).toEqual([[mockConfig]]);
                // @ts-ignore
                expect(mockAssembleTo.mock.calls).toEqual([[mockInFp, mockOutFp, mockSymbFp]]);

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
                expect(fs.createWriteStream.mock.calls).toEqual([['chickenworld.star'], ['chickenworld.squidward']]);
                // @ts-ignore
                expect(getConfig.mock.calls).toEqual([['lc3']]);
                // @ts-ignore
                expect(getSerializer.mock.calls).toEqual([]);
                // @ts-ignore
                expect(Assembler.mock.calls).toEqual([[mockConfig]]);
                // @ts-ignore
                expect(mockAssembleTo.mock.calls).toEqual([[mockInFp, mockOutFp, mockSymbFp]]);

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
                expect(fs.createWriteStream.mock.calls).toEqual([['chickenworld.tl6'], ['chickenworld.anime']]);
                // @ts-ignore
                expect(getConfig.mock.calls).toEqual([['lc3']]);
                // @ts-ignore
                expect(getSerializer.mock.calls).toEqual([['honker']]);
                // @ts-ignore
                expect(Assembler.mock.calls).toEqual([[mockConfig]]);
                // @ts-ignore
                expect(mockAssembleTo.mock.calls).toEqual([[mockInFp, mockOutFp, mockSymbFp]]);

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
        let mockAsm: Assembler;
        // @ts-ignore
        let mockCfg: AssemblerConfig = {joe: 'biden'};
        let mockSymbTable: SymbTable = {nice: 0x69};
        let mockSections: MachineCodeSection[] = [
            {startAddr: 0x420, words: [0xdead, 0xbeef]},
        ];

        beforeAll(() => {
            mockSimConfig = {
                // @ts-ignore
                isa: {donkey: 'horse apple'},
                loader: {
                    load: jest.fn(),
                    fileExt: () => 'obj',
                    symbFileExt: () => 'lemonade',
                    loadSymb: jest.fn(),
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
            getConfig.mockReturnValue(mockCfg);
            // @ts-ignore
            Assembler.mockImplementation(() => mockAsm);
            // @ts-ignore
            mockAsm.assemble.mockReturnValue(
                Promise.resolve([mockSymbTable, mockSections]));
            // @ts-ignore
            getSimulatorConfig.mockReturnValue(mockSimConfig);
            // @ts-ignore
            fs.createReadStream.mockReturnValue(mockFp);
        });

        afterEach(() => {
            // @ts-ignore
            getConfig.mockReset();
            // @ts-ignore
            Assembler.mockReset();
            // @ts-ignore
            getSimulatorConfig.mockReset();
            // @ts-ignore
            fs.createReadStream.mockReset();
            // @ts-ignore
            mockSimConfig.loader.load.mockReset();
            // @ts-ignore
            mockSimConfig.loader.loadSymb.mockReset();
        });

        describe('sim subcommand', () => {
            let mockStdin: Readable;
            let mockIo: StreamIO;
            let mockSim: Simulator;

            beforeAll(() => {
                // @ts-ignore
                mockAsm = {
                    assemble: jest.fn(),
                };
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
                    loadSections: jest.fn(),
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
                mockAsm.assemble.mockReset();
                // @ts-ignore
                StreamIO.mockReset();
                // @ts-ignore
                Simulator.mockReset();
                // @ts-ignore
                mockSim.loadSections.mockReset();
                // @ts-ignore
                mockSim.run.mockReset();
            });

            it('simulates object file', () => {
                return main(['sim', 'farzam.obj'],
                            mockStdin, stdout, stderr).then(exitCode => {
                    expect(stdoutActual).toEqual('');
                    expect(stderrActual).toEqual('');
                    expect(exitCode).toEqual(0);

                    // @ts-ignore
                    expect(getSimulatorConfig.mock.calls).toEqual([['lc3']]);
                    // @ts-ignore
                    expect(fs.createReadStream.mock.calls).toEqual([['farzam.obj']]);
                    // @ts-ignore
                    expect(getConfig.mock.calls).toEqual([]);
                    // @ts-ignore
                    expect(Assembler.mock.calls).toEqual([]);
                    // @ts-ignore
                    expect(mockSim.loadSections.mock.calls).toEqual([]);
                    // @ts-ignore
                    expect(StreamIO.mock.calls).toEqual([[mockStdin, stdout]]);
                    // @ts-ignore
                    expect(Simulator.mock.calls).toEqual([[mockSimConfig.isa, mockIo, 8192]]);
                    // @ts-ignore
                    expect(mockSim.run.mock.calls).toEqual([[]]);
                });
            });

            it('simulates object file', () => {
                return main(['sim', '-x', '69', 'persia.obj'],
                            mockStdin, stdout, stderr).then(exitCode => {
                    expect(stdoutActual).toEqual('');
                    expect(stderrActual).toEqual('');
                    expect(exitCode).toEqual(0);

                    // @ts-ignore
                    expect(getSimulatorConfig.mock.calls).toEqual([['lc3']]);
                    // @ts-ignore
                    expect(fs.createReadStream.mock.calls).toEqual([['persia.obj']]);
                    // @ts-ignore
                    expect(getConfig.mock.calls).toEqual([]);
                    // @ts-ignore
                    expect(Assembler.mock.calls).toEqual([]);
                    // @ts-ignore
                    expect(mockSim.loadSections.mock.calls).toEqual([]);
                    // @ts-ignore
                    expect(StreamIO.mock.calls).toEqual([[mockStdin, stdout]]);
                    // @ts-ignore
                    expect(Simulator.mock.calls).toEqual([[mockSimConfig.isa, mockIo, 69]]);
                    // @ts-ignore
                    expect(mockSim.run.mock.calls).toEqual([[]]);
                });
            });

            it('assembles and simulates assembly file', () => {
                return main(['sim', 'marley.s'],
                            mockStdin, stdout, stderr).then(exitCode => {
                    expect(stdoutActual).toEqual('');
                    expect(stderrActual).toEqual('');
                    expect(exitCode).toEqual(0);

                    // @ts-ignore
                    expect(getSimulatorConfig.mock.calls).toEqual([['lc3']]);
                    // @ts-ignore
                    expect(fs.createReadStream.mock.calls).toEqual([['marley.s']]);
                    // @ts-ignore
                    expect(getConfig.mock.calls).toEqual([['lc3']]);
                    // @ts-ignore
                    expect(Assembler.mock.calls).toEqual([[mockCfg]]);
                    // @ts-ignore
                    expect(mockSim.loadSections.mock.calls).toEqual([[mockSections]]);
                    // @ts-ignore
                    expect(StreamIO.mock.calls).toEqual([[mockStdin, stdout]]);
                    // @ts-ignore
                    expect(Simulator.mock.calls).toEqual([[mockSimConfig.isa, mockIo, 8192]]);
                    // @ts-ignore
                    expect(mockSim.run.mock.calls).toEqual([[]]);
                });
            });

            it('handles nonexistent object file', () => {
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
                    loadSections: jest.fn(),
                    setSymbols: jest.fn(),
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
                mockDbg.loadSections.mockReset();
                // @ts-ignore
                mockDbg.setSymbols.mockReset();
                // @ts-ignore
                mockDbg.run.mockReset();
                // @ts-ignore
                mockDbg.close.mockReset();
            });

            it('assembles and launches debugger on assembly code', () => {
                return main(['dbg', 'asdf.becker'],
                            stdin, stdout, stderr).then(exitCode => {
                    expect(stdoutActual).toEqual('');
                    expect(stderrActual).toEqual('');
                    expect(exitCode).toEqual(0);

                    // @ts-ignore
                    expect(getSimulatorConfig.mock.calls).toEqual([['lc3']]);
                    // @ts-ignore
                    expect(fs.createReadStream.mock.calls).toEqual([['asdf.becker']]);
                    // @ts-ignore
                    expect(mockSimConfig.loader.load.mock.calls).toEqual([]);
                    // @ts-ignore
                    expect(mockSimConfig.loader.loadSymb.mock.calls).toEqual([]);
                    // @ts-ignore
                    expect(getConfig.mock.calls).toEqual([['lc3']]);
                    // @ts-ignore
                    expect(Assembler.mock.calls).toEqual([[mockCfg]]);
                    // @ts-ignore
                    expect(mockDbg.loadSections.mock.calls).toEqual([[mockSections]]);
                    // @ts-ignore
                    expect(CliDebugger.mock.calls).toEqual([[mockSimConfig.isa, stdin, stdout]]);
                    // @ts-ignore
                    expect(mockDbg.setSymbols.mock.calls).toEqual([[mockSymbTable]]);
                    // @ts-ignore
                    expect(mockDbg.run.mock.calls).toEqual([[]]);
                    // @ts-ignore
                    expect(mockDbg.close.mock.calls).toEqual([[]]);
                });
            });

            it('launches debugger with debug symbols', () => {
                return main(['dbg', 'brickell.obj'],
                            stdin, stdout, stderr).then(exitCode => {
                    expect(stdoutActual).toEqual('');
                    expect(stderrActual).toEqual('');
                    expect(exitCode).toEqual(0);

                    // @ts-ignore
                    expect(getSimulatorConfig.mock.calls).toEqual([['lc3']]);
                    // @ts-ignore
                    expect(fs.createReadStream.mock.calls).toEqual([['brickell.obj'], ['brickell.lemonade']]);
                    // @ts-ignore
                    expect(mockSimConfig.loader.load.mock.calls).toEqual([[mockSimConfig.isa, mockFp, mockDbg]]);
                    // @ts-ignore
                    expect(mockSimConfig.loader.loadSymb.mock.calls).toEqual([[mockFp, mockDbg]]);
                    // @ts-ignore
                    expect(getConfig.mock.calls).toEqual([]);
                    // @ts-ignore
                    expect(Assembler.mock.calls).toEqual([]);
                    // @ts-ignore
                    expect(mockDbg.loadSections.mock.calls).toEqual([]);
                    // @ts-ignore
                    expect(CliDebugger.mock.calls).toEqual([[mockSimConfig.isa, stdin, stdout]]);
                    // @ts-ignore
                    expect(mockDbg.run.mock.calls).toEqual([[]]);
                    // @ts-ignore
                    expect(mockDbg.close.mock.calls).toEqual([[]]);
                });
            });

            it('launches debugger without debug symbols', () => {
                // @ts-ignore
                fs.createReadStream.mockReset();
                // @ts-ignore
                fs.createReadStream.mockReturnValueOnce(mockFp);
                // @ts-ignore
                fs.createReadStream.mockReturnValueOnce({
                    // @ts-ignore
                    on(ev, cb) {
                        if (ev === 'error') cb(new Error('ENOENT'));
                    }
                });

                return main(['dbg', 'brickell.obj'],
                            stdin, stdout, stderr).then(exitCode => {
                    expect(stdoutActual).toEqual('');
                    expect(stderrActual).toMatch(/warning:.*ENOENT/);
                    expect(exitCode).toEqual(0);

                    // @ts-ignore
                    expect(getSimulatorConfig.mock.calls).toEqual([['lc3']]);
                    // @ts-ignore
                    expect(fs.createReadStream.mock.calls).toEqual([['brickell.obj'], ['brickell.lemonade']]);
                    // @ts-ignore
                    expect(mockSimConfig.loader.load.mock.calls).toEqual([[mockSimConfig.isa, mockFp, mockDbg]]);
                    // @ts-ignore
                    expect(mockSimConfig.loader.loadSymb.mock.calls).toEqual([]);
                    // @ts-ignore
                    expect(getConfig.mock.calls).toEqual([]);
                    // @ts-ignore
                    expect(Assembler.mock.calls).toEqual([]);
                    // @ts-ignore
                    expect(mockDbg.loadSections.mock.calls).toEqual([]);
                    // @ts-ignore
                    expect(CliDebugger.mock.calls).toEqual([[mockSimConfig.isa, stdin, stdout]]);
                    // @ts-ignore
                    expect(mockDbg.run.mock.calls).toEqual([[]]);
                    // @ts-ignore
                    expect(mockDbg.close.mock.calls).toEqual([[]]);
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
                    expect(stdoutActual).toEqual('');
                    expect(stderrActual).toMatch(/setup error.+oops i did it again/);
                    expect(exitCode).toEqual(1);

                    // @ts-ignore
                    expect(fs.createReadStream.mock.calls).toEqual([['brickell.obj']]);
                    // @ts-ignore
                    expect(CliDebugger.mock.calls).toEqual([]);
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
                    expect(stdoutActual).toEqual('');
                    expect(stderrActual).toMatch('error: unexpected end-of-file');
                    expect(exitCode).toEqual(1);

                    // @ts-ignore
                    expect(getSimulatorConfig.mock.calls).toEqual([['lc3']]);
                    // @ts-ignore
                    expect(fs.createReadStream.mock.calls).toEqual([['daisy.obj'], ['daisy.lemonade']]);
                    // @ts-ignore
                    expect(mockSimConfig.loader.load.mock.calls).toEqual([[mockSimConfig.isa, mockFp, mockDbg]]);
                    // @ts-ignore
                    expect(mockSimConfig.loader.loadSymb.mock.calls).toEqual([[mockFp, mockDbg]]);
                    // @ts-ignore
                    expect(getConfig.mock.calls).toEqual([]);
                    // @ts-ignore
                    expect(Assembler.mock.calls).toEqual([]);
                    // @ts-ignore
                    expect(mockDbg.loadSections.mock.calls).toEqual([]);
                    // @ts-ignore
                    expect(CliDebugger.mock.calls).toEqual([[mockSimConfig.isa, stdin, stdout]]);
                    // @ts-ignore
                    expect(mockDbg.run.mock.calls).toEqual([[]]);
                    // @ts-ignore
                    expect(mockDbg.close.mock.calls).toEqual([[]]);
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
