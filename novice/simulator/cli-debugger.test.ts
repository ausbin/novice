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
            //close: () => {stdin.finish(); stdout.finish();},
            close: jest.fn(),
            on: jest.fn(),
            question: jest.fn(),
        };
    });

    afterEach(() => {
        // @ts-ignore
        readline.createInterface.mockReset();
    });

    function runCmd(cmd: string): void {
        // @ts-ignore
        mockInterface.question.mockImplementationOnce((q, cb) => {
            cb(cmd);
        });
    }

    describe('lc3 debugging', () => {
        beforeEach(() => {
            dbg = new CliDebugger(getIsa('lc3'), stdin, stdout);
        });

        it('quits', () => {
            runCmd('h');
            runCmd('q');

            return dbg.run().then(() => {
                expect(stdoutActual).toMatch('novice debugger usage');
                expect(stdoutActual).toMatch(/h\[elp\]\s+show this message/);
                expect(stdoutActual).toMatch(/q\[uit\]\s+escape this foul debugger/);
            });
        });
    });
});
