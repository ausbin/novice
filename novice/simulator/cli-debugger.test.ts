import { getIsa } from '../isa';
import { CliDebugger } from './cli-debugger';
import { Readable, Writable } from 'stream';

jest.mock('readline');
import * as readline from 'readline';

describe('cli debugger', () => {
    let dbg: CliDebugger;
    let stdinActual: string, stdoutActual: string;
    let stdin: Readable, stdout: Writable;
    let mockInterface: readline.Interface;

    beforeEach(() => {
        stdinActual = stdoutActual = '';
        // @ts-ignore
        readline.createInterface.mockReturnValue(mockInterface);
    });

    beforeAll(() => {
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
            write(data, enc, cb) {
                stdoutActual += data.toString();
                if (cb) cb();
            }
        });

        // @ts-ignore
        mockInterface = {
            close: jest.fn(),
            on: jest.fn(),
            question: jest.fn(),
        };
    });

    afterEach(() => {
        // @ts-ignore
        readline.createInterface.mockReset();
        // @ts-ignore
        mockInterface.close.mockReset();
        // @ts-ignore
        mockInterface.on.mockReset();
        // @ts-ignore
        mockInterface.question.mockReset();
    });

    function runCmd(cmd: string): void {
        // @ts-ignore
        mockInterface.question.mockImplementationOnce((q, cb) => {
            expect(q).toEqual('(novice) ');
            cb(cmd);
        });
    }

    function sendInputChar(c: string): void {
        // @ts-ignore
        mockInterface.question.mockImplementationOnce((q, cb) => {
            expect(q).toEqual('');
            cb(c);
        });
    }

    describe('lc3 debugging', () => {
        beforeEach(() => {
            dbg = new CliDebugger(getIsa('lc3'), stdin, stdout);
        });

        it('quits', () => {
            runCmd('q');

            return dbg.run().then(() => {
                // @ts-ignore
                expect(mockInterface.question.mock.calls.length).toEqual(1);
                // @ts-ignore
                expect(mockInterface.question.mock.calls[0][0]).toEqual('(novice) ');
                expect(stdoutActual).toMatch('==> 0x3000');
            });
        });

        it('displays help', () => {
            runCmd('h');
            runCmd('q');

            return dbg.run().then(() => {
                expect(stdoutActual).toMatch('novice debugger usage');
                expect(stdoutActual).toMatch(/h\[elp\]\s+show this message/);
                expect(stdoutActual).toMatch(/q\[uit\]\s+escape this foul debugger/);
            });
        });

        it('re-runs last command on empty input', () => {
            runCmd('h');
            runCmd('');
            runCmd('q');

            return dbg.run().then(() => {
                expect(stdoutActual).toMatch(/novice debugger usage[^]+novice debugger usage/);
            });
        });

        it('does not step past halt', () => {
            dbg.store(0x3000, 0xf025);
            runCmd('s');
            runCmd('s');
            runCmd('s');
            runCmd('q');

            return dbg.run().then(() => {
                expect(stdoutActual).toMatch(/==> 0x3000[^]+==> 0x3000[^]+==> 0x3000/);
            });
        });

        it('blows up with wrong number of operands', () => {
            runCmd('s 1');
            runCmd('q');

            return dbg.run().then(() => {
                expect(stdoutActual).toMatch('command step expects 0 operands but got 1');
            });
        });

        it('catches exceptions thrown by command', () => {
            runCmd('u');
            runCmd('q');

            return dbg.run().then(() => {
                expect(stdoutActual).toMatch('error: already at the beginning of time');
            });
        });

        it('handles invalid command', () => {
            runCmd('bogus');
            runCmd('q');

            return dbg.run().then(() => {
                expect(stdoutActual).toMatch('unknown command `bogus\'');
            });
        });

        it('closes readline on close()', () => {
            dbg.close();
            // @ts-ignore
            expect(mockInterface.close.mock.calls).toEqual([[]]);
        });

        it('errors on label breakpoint', () => {
            runCmd('b asdf');
            runCmd('q');

            return dbg.run().then(() => {
                expect(stdoutActual).toMatch('not yet implemented');
                // Don't print state again after an error
                expect(stdoutActual).not.toMatch(/==>[^]+==>/);
            });
        });

        it('steps work', () => {
            dbg.store(0x3000, 0x5020); // and r0, r0, 0
            dbg.store(0x3001, 0x1023); // add r0, r0, 3
            dbg.store(0x3002, 0x5220); // and r1, r0, 0
            dbg.store(0x3003, 0x1264); // add r1, r1, 4
            dbg.store(0x3004, 0xf025); // halt

            for (let i = 0x3000; i <= 0x3004; i++) runCmd('s');
            runCmd('q');

            return dbg.run().then(() => {
                expect(stdoutActual).toMatch(/==> 0x3000[^]+==> 0x3001[^]+==> 0x3002[^]+==> 0x3003[^]+==> 0x3004[^]+==> 0x3004/);
                expect(stdoutActual).toMatch(/r0: 0x0000[^]+r0: 0x0000[^]+r0: 0x0003[^]+r0: 0x0003[^]+r0: 0x0003[^]+r0: 0x0003/);
                expect(stdoutActual).toMatch(/r1: 0x0000[^]+r1: 0x0000[^]+r1: 0x0000[^]+r1: 0x0000[^]+r1: 0x0004[^]+r1: 0x0004/);
            });
        });

        it('breakpoints, continue work', () => {
            dbg.store(0x3000, 0x5020); // and r0, r0, 0
            dbg.store(0x3001, 0x1023); // add r0, r0, 3
            dbg.store(0x3002, 0x5220); // and r1, r0, 0
            dbg.store(0x3003, 0x1264); // add r1, r1, 4
            dbg.store(0x3004, 0xf025); // halt

            runCmd('b 0x3002');
            runCmd('c');
            runCmd('c');
            runCmd('q');

            return dbg.run().then(() => {
                expect(stdoutActual).toMatch('breakpoint set at 0x3002');
                expect(stdoutActual).toMatch(/==> 0x3000[^]+==> 0x3002[^]+==> 0x3004/);
                expect(stdoutActual).toMatch(/r0: 0x0000[^]+r0: 0x0003[^]+r0: 0x0003/);
                expect(stdoutActual).toMatch(/r1: 0x0000[^]+r1: 0x0000[^]+r1: 0x0004/);
            });
        });

        it('puts works', () => {
            dbg.store(0x3000, 0xe002); // lea r0, message
            dbg.store(0x3001, 0xf022); // puts
            dbg.store(0x3002, 0xf025); // halt
            dbg.store(0x3003, 0x0068); // message .stringz "hello dad\n"
            dbg.store(0x3004, 0x0065);
            dbg.store(0x3005, 0x006c);
            dbg.store(0x3006, 0x006c);
            dbg.store(0x3007, 0x006f);
            dbg.store(0x3008, 0x0020);
            dbg.store(0x3009, 0x0064);
            dbg.store(0x300a, 0x0061);
            dbg.store(0x300b, 0x0064);
            dbg.store(0x300c, 0x000a);
            dbg.store(0x300d, 0x0000);

            runCmd('c');
            runCmd('q');

            return dbg.run().then(() => {
                expect(stdoutActual).toMatch('hello dad\n');
            });
        });

        it('puts works but puts ↲ after fake linebreak', () => {
            dbg.store(0x3000, 0xe002); // lea r0, message
            dbg.store(0x3001, 0xf022); // puts
            dbg.store(0x3002, 0xf025); // halt
            dbg.store(0x3003, 0x0064); // message .stringz "dad"
            dbg.store(0x3004, 0x0061);
            dbg.store(0x3005, 0x0064);
            dbg.store(0x3006, 0x0000);

            runCmd('c');
            runCmd('q');

            return dbg.run().then(() => {
                expect(stdoutActual).toMatch(/^dad↲$/m);
            });
        });

        it('getc works', () => {
            // outputs stdin to stdout until it hits a character which is not a lowercase
            // letter a-z
            dbg.store(0x3000, 0x56e0); // and r3, r3, 0 ; r3 <- 0
            dbg.store(0x3001, 0xf020); // loop getc ; r0 <- input
            dbg.store(0x3002, 0x2411); // ld r2, ascii_a
            dbg.store(0x3003, 0x94bf); // not r2, r2
            dbg.store(0x3004, 0x14a1); // add r2, r2, 1 ; r2 <- -'a'
            dbg.store(0x3005, 0x1480); // add r2, r2, r0 ; r2 <- c - 'a'
            dbg.store(0x3006, 0x0808); // brn done
            dbg.store(0x3007, 0x240d); // ld r2, ascii_z
            dbg.store(0x3008, 0x94bf); // not r2, r2
            dbg.store(0x3009, 0x14a1); // add r2, r2, 1 ; r2 <- -'z'
            dbg.store(0x300a, 0x1480); // add r2, r2, r0 ; r2 <- c - 'z'
            dbg.store(0x300b, 0x0203); // brp done
            dbg.store(0x300c, 0xf021); // out
            dbg.store(0x300d, 0x1620); // add r3, r0, 0
            dbg.store(0x300e, 0x0ff2); // br loop
            dbg.store(0x300f, 0x16e0); // done add r3, r3, 0
            dbg.store(0x3010, 0x0402); // brz die
            dbg.store(0x3011, 0x2004); // ld r0, ascii_lf
            dbg.store(0x3012, 0xf021); // out
            dbg.store(0x3013, 0xf025); // die halt
            dbg.store(0x3014, 0x0061); // ascii_a .fill 'a'
            dbg.store(0x3015, 0x007a); // ascii_z .fill 'z'
            dbg.store(0x3016, 0x000a); // ascii_lf .fill '\n'

            runCmd('c');
            'ilikebigstringsandicannotlie '.split('').forEach(sendInputChar);
            runCmd('q');

            return dbg.run().then(() => {
                expect(stdoutActual).toMatch(/^ilikebigstringsandicannotlie$/m);
            });
        });

        it('complains if you type more than 1 char for getc', () => {
            dbg.store(0x3000, 0xf020); // getc
            dbg.store(0x3001, 0xf025); // halt

            runCmd('c');
            sendInputChar('whoopsie');
            sendInputChar('x');
            runCmd('q');

            return dbg.run().then(() => {
                expect(stdoutActual).toMatch('please type exactly 1 char');
            });
        });

        it('prints memory with range including pc', () => {
            dbg.store(0x3000, 0xe002); // lea r0, message
            dbg.store(0x3001, 0xf022); // puts
            dbg.store(0x3002, 0xf025); // halt
            dbg.store(0x3003, 0x0068); // message .stringz "hello dad\n"
            dbg.store(0x3004, 0x0065);
            dbg.store(0x3005, 0x006c);
            dbg.store(0x3006, 0x006c);
            dbg.store(0x3007, 0x006f);
            dbg.store(0x3008, 0x0020);
            dbg.store(0x3009, 0x0064);
            dbg.store(0x300a, 0x0061);
            dbg.store(0x300b, 0x0064);
            dbg.store(0x300c, 0x000a);
            dbg.store(0x300d, 0x0000);

            runCmd('p 0x3000-0x3004');
            runCmd('q');

            return dbg.run().then(() => {
                expect(stdoutActual).toMatch(/0x3000[^]+^==> 0x3000:  0xe002  -8190   lea r0, 2  $/m);
                expect(stdoutActual).toMatch(/0x3001[^]+^    0x3001:  0xf022  -4062   puts       $/m);
                expect(stdoutActual).toMatch(/0x3002[^]+^    0x3002:  0xf025  -4059   halt       $/m);
                expect(stdoutActual).toMatch(/0x3003[^]+^    0x3003:  0x0068  104                $/m);
                expect(stdoutActual).toMatch(/0x3004[^]+^    0x3004:  0x0065  101                $/m);
            });
        });

        it('prints memory with range not including pc', () => {
            dbg.store(0x3000, 0xe002); // lea r0, message
            dbg.store(0x3001, 0xf022); // puts
            dbg.store(0x3002, 0xf025); // halt
            dbg.store(0x3003, 0x0068); // message .stringz "hello dad\n"
            dbg.store(0x3004, 0x0065);
            dbg.store(0x3005, 0x006c);
            dbg.store(0x3006, 0x006c);
            dbg.store(0x3007, 0x006f);
            dbg.store(0x3008, 0x0020);
            dbg.store(0x3009, 0x0064);
            dbg.store(0x300a, 0x0061);
            dbg.store(0x300b, 0x0064);
            dbg.store(0x300c, 0x000a);
            dbg.store(0x300d, 0x0000);

            runCmd('p 0x3001-0x3004');
            runCmd('q');

            return dbg.run().then(() => {
                expect(stdoutActual).toMatch(/0x3001[^]+^0x3001:  0xf022  -4062   puts  $/m);
                expect(stdoutActual).toMatch(/0x3002[^]+^0x3002:  0xf025  -4059   halt  $/m);
                expect(stdoutActual).toMatch(/0x3003[^]+^0x3003:  0x0068  104           $/m);
                expect(stdoutActual).toMatch(/0x3004[^]+^0x3004:  0x0065  101           $/m);
            });
        });

        it('prints memory with decimal range', () => {
            dbg.store(0x3000, 0xe002); // lea r0, message
            dbg.store(0x3001, 0xf022); // puts
            dbg.store(0x3002, 0xf025); // halt
            dbg.store(0x3003, 0x0068); // message .stringz "hello dad\n"
            dbg.store(0x3004, 0x0065);
            dbg.store(0x3005, 0x006c);
            dbg.store(0x3006, 0x006c);
            dbg.store(0x3007, 0x006f);
            dbg.store(0x3008, 0x0020);
            dbg.store(0x3009, 0x0064);
            dbg.store(0x300a, 0x0061);
            dbg.store(0x300b, 0x0064);
            dbg.store(0x300c, 0x000a);
            dbg.store(0x300d, 0x0000);

            runCmd('p 12289-0x3002');
            runCmd('q');

            return dbg.run().then(() => {
                expect(stdoutActual).toMatch(/0x3001[^]+^0x3001:  0xf022  -4062   puts  $/m);
                expect(stdoutActual).toMatch(/0x3002[^]+^0x3002:  0xf025  -4059   halt  $/m);
            });
        });

        it('prints single address', () => {
            dbg.store(0x3000, 0xe002); // lea r0, message
            dbg.store(0x3001, 0xf022); // puts
            dbg.store(0x3002, 0xf025); // halt
            dbg.store(0x3003, 0x0068); // message .stringz "hello dad\n"
            dbg.store(0x3004, 0x0065);
            dbg.store(0x3005, 0x006c);
            dbg.store(0x3006, 0x006c);
            dbg.store(0x3007, 0x006f);
            dbg.store(0x3008, 0x0020);
            dbg.store(0x3009, 0x0064);
            dbg.store(0x300a, 0x0061);
            dbg.store(0x300b, 0x0064);
            dbg.store(0x300c, 0x000a);
            dbg.store(0x300d, 0x0000);

            runCmd('p 0x3001');
            runCmd('q');

            return dbg.run().then(() => {
                expect(stdoutActual).toMatch(/0x3001[^]+^0x3001:  0xf022  -4062   puts  $/m);
            });
        });

        it('errors when weird operand is passed to print', () => {
            runCmd('p 0x3000-0x3001-0x3002');
            runCmd('q');

            return dbg.run().then(() => {
                expect(stdoutActual).toMatch('error: expected range');
            });
        });
    });
});
