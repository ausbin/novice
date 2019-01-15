import { Simulator } from '.';
import { IO, getIsa } from '../isa';

describe('simulator', () => {
    let stdin: string;
    let stdout: string;
    let sim: Simulator;

    beforeEach(() => {
        const io: IO = {
            getc() {
                if (stdin) {
                    const c = stdin.charCodeAt(0);
                    stdin = stdin.slice(1);
                    return c;
                } else {
                    throw new Error('unexpected EOF on stdin');
                }
            },
            putc(c: number) {
                stdout += String.fromCharCode(c);
            },
        };

        stdin = stdout = "";
        sim = new Simulator(getIsa('lc3'), io);
    });

    describe('run()', () => {
        it('executes a halt', () => {
            sim.store(0x3000, 0xf025); // halt
            sim.run();

            expect(sim.halted).toBe(true);
            expect(sim.pc).toEqual(0x3001);
        });

        it('adds two numbers', () => {
            sim.store(0x3000, 0b0101001001100000); // and r1, r1, 0
            sim.store(0x3001, 0b0101010010100000); // and r2, r2, 0
            sim.store(0x3002, 0b0001001001101111); // add r1, r1, 15
            sim.store(0x3003, 0b0001010010100011); // add r2, r2, 3
            sim.store(0x3004, 0b0001111001000010); // add r7, r1, r2
            sim.store(0x3005, 0xf025); // halt
            sim.run();

            expect(sim.halted).toBe(true);
            expect(sim.pc).toEqual(0x3006);
            expect(sim.regs).toEqual({
                solo: {'cc': 0b001},
                range: {'r': [
                    0, 15, 3,  0,
                    0,  0, 0, 18
                ]},
            });
        });

        it('executes hello world', () => {
            sim.store(0x3000, 0b1110000000000010); // lea r0, 2
            sim.store(0x3001, 0xf022); // puts
            sim.store(0x3002, 0xf025); // halt
            sim.store(0x3003, 'h'.charCodeAt(0)); // .stringz "hello world!\n"
            sim.store(0x3004, 'e'.charCodeAt(0));
            sim.store(0x3005, 'l'.charCodeAt(0));
            sim.store(0x3006, 'l'.charCodeAt(0));
            sim.store(0x3007, 'o'.charCodeAt(0));
            sim.store(0x3008, ' '.charCodeAt(0));
            sim.store(0x3009, 'w'.charCodeAt(0));
            sim.store(0x300a, 'o'.charCodeAt(0));
            sim.store(0x300b, 'r'.charCodeAt(0));
            sim.store(0x300c, 'l'.charCodeAt(0));
            sim.store(0x300d, 'd'.charCodeAt(0));
            sim.store(0x300e, '!'.charCodeAt(0));
            sim.store(0x300f, '\n'.charCodeAt(0));
            sim.store(0x3010, 0);
            sim.run();

            expect(sim.halted).toBe(true);
            expect(sim.pc).toEqual(0x3003);
            expect(sim.regs).toEqual({
                solo: {'cc': 0b001},
                range: {'r': [
                    0x3003, 0, 0, 0,
                         0, 0, 0, 0,
                ]},
            });
            expect(stdout).toEqual("hello world!\n");
        });
    });
});
