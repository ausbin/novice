import { Simulator } from '.';
import { IO, getIsa } from '../isa';

describe('simulator', () => {
    let stdin: string;
    let stdout: string;
    let sim: Simulator;

    beforeEach(() => {
        const io: IO = {
            getc() {
                if (stdin.length > 0) {
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
                    0x0000, 0x000f, 0x0003, 0x0000,
                    0x0000, 0x0000, 0x0000, 0x0012,
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
                    0x3003, 0x0000, 0x0000, 0x0000,
                    0x0000, 0x0000, 0x0000, 0x0000,
                ]},
            });
            expect(stdout).toEqual("hello world!\n");
        });

        it('executes code which sets CC=n', () => {
            sim.store(0x3000, 0b0101001001100000); // and r1, r1, 0
            sim.store(0x3001, 0b0001001001111110); // add r1, r1, -2
            sim.store(0x3002, 0xf025); // halt
            sim.run();

            expect(sim.halted).toBe(true);
            expect(sim.pc).toEqual(0x3003);
            expect(sim.regs).toEqual({
                solo: {'cc': 0b100},
                range: {'r': [
                    0x0000, 0xfffe, 0x0000, 0x0000,
                    0x0000, 0x0000, 0x0000, 0x0000,
                ]},
            });
        });

        it('executes code which sets CC=z', () => {
            sim.store(0x3000, 0b0101001001100000); // and r1, r1, 0
            sim.store(0x3001, 0xf025); // halt
            sim.run();

            expect(sim.halted).toBe(true);
            expect(sim.pc).toEqual(0x3002);
            expect(sim.regs).toEqual({
                solo: {'cc': 0b010},
                range: {'r': [
                    0x0000, 0x0000, 0x0000, 0x0000,
                    0x0000, 0x0000, 0x0000, 0x0000,
                ]},
            });
        });

        it('executes code which sets CC=p', () => {
            sim.store(0x3000, 0b0101001001100000); // and r1, r1, 0
            sim.store(0x3001, 0b0001001001100010); // add r1, r1, 2
            sim.store(0x3002, 0xf025); // halt
            sim.run();

            expect(sim.halted).toBe(true);
            expect(sim.pc).toEqual(0x3003);
            expect(sim.regs).toEqual({
                solo: {'cc': 0b001},
                range: {'r': [
                    0x0000, 0x0002, 0x0000, 0x0000,
                    0x0000, 0x0000, 0x0000, 0x0000,
                ]},
            });
        });

        it('executes arithmetic instructions', () => {
            sim.store(0x3000, 0b0101000000100000); // and r0, r0, 0
            sim.store(0x3001, 0b0001010000101100); // add r2, r0, 12
            sim.store(0x3002, 0b1001011010111111); // not r3, r2
            sim.store(0x3003, 0b1001100000111111); // not r4, r0
            sim.store(0x3004, 0b0101101011000100); // and r5, r3, r4
            sim.store(0x3005, 0xf025); // halt
            sim.run();

            expect(sim.halted).toBe(true);
            expect(sim.pc).toEqual(0x3006);
            expect(sim.regs).toEqual({
                solo: {'cc': 0b100},
                range: {'r': [
                    0x0000, 0x0000, 0x000c, 0xfff3,
                    0xffff, 0xfff3, 0x0000, 0x0000,
                ]},
            });
        });

        it('executes unconditional branch instructions', () => {
            sim.store(0x3000, 0b0101000000100000); // and r0, r0, 0
            sim.store(0x3001, 0b0000111000000001); // br label0
            sim.store(0x3002, 0b0001001000100001); // add r1, r0, 1
            sim.store(0x3003, 0b0100100000000001); // label0 jsr label1
            sim.store(0x3004, 0b0001010000100001); // add r2, r0, 1
            sim.store(0x3005, 0b1110110000000010); // label1 lea r6, label2
            sim.store(0x3006, 0b0100000110000000); // jsrr r6
            sim.store(0x3007, 0b0001011000100001); // add r3, r0, 1
            sim.store(0x3008, 0b1110101000000010); // label2 lea r5, label3
            sim.store(0x3009, 0b1100000101000000); // jmp r5
            sim.store(0x300a, 0b0001100000100001); // add r4, r0, 1
            sim.store(0x300c, 0xf025); // label3 halt
            sim.run();

            expect(sim.halted).toBe(true);
            expect(sim.pc).toEqual(0x300d);
            expect(sim.regs).toEqual({
                solo: {'cc': 0b001},
                range: {'r': [
                    0x0000, 0x0000, 0x0000, 0x0000,
                    0x0000, 0x300b, 0x3008, 0x3007,
                ]},
            });
        });

        it('executes true traps', () => {
            sim.store(0x00f0, 0x2000); // trap table

            sim.store(0x2000, 0b0001010000000001); // add r2, r0, r1
            sim.store(0x2001, 0b1100000111000000); // ret

            sim.store(0x3000, 0b0101000000100000); // and r0, r0, 0
            sim.store(0x3001, 0b0001001000100010); // add r1, r0, 2
            sim.store(0x3002, 0b0001000000101101); // add r0, r0, 13
            sim.store(0x3003, 0xf0f0); // trap xf0
            sim.store(0x3004, 0xf025); // halt
            sim.run();

            expect(sim.halted).toBe(true);
            expect(sim.pc).toEqual(0x3005);
            expect(sim.regs).toEqual({
                solo: {'cc': 0b001},
                range: {'r': [
                    0x000d, 0x0002, 0x000f, 0x0000,
                    0x0000, 0x0000, 0x0000, 0x3004,
                ]},
            });
        });

        it('executes conditional branch instructions with cc=n', () => {
            sim.store(0x3000, 0b0101000000100000); // and r0, r0, 0
            sim.store(0x3001, 0b1001111000111111); // not r7, r0

            sim.store(0x3002, 0b0001111111100000); // add r7, r7, 0
            sim.store(0x3003, 0b0000001000000001); // brp 1 ; NOT TAKEN
            sim.store(0x3004, 0b0001001000100001); // add r1, r0, 1

            sim.store(0x3005, 0b0001111111100000); // add r7, r7, 0
            sim.store(0x3006, 0b0000010000000001); // brz 1 ; NOT TAKEN
            sim.store(0x3007, 0b0001010000100001); // add r2, r0, 1

            sim.store(0x3008, 0b0001111111100000); // add r7, r7, 0
            sim.store(0x3009, 0b0000011000000001); // brzp 1 ; NOT TAKEN
            sim.store(0x300a, 0b0001011000100001); // add r3, r0, 1

            sim.store(0x300b, 0b0001111111100000); // add r7, r7, 0
            sim.store(0x300c, 0b0000100000000001); // brn 1 ; TAKEN
            sim.store(0x300d, 0b0001100000100001); // add r4, r0, 1

            sim.store(0x300e, 0b0001111111100000); // add r7, r7, 0
            sim.store(0x300f, 0b0000101000000001); // brnp 1 ; TAKEN
            sim.store(0x3010, 0b0001101000100001); // add r5, r0, 1

            sim.store(0x3011, 0b0001111111100000); // add r7, r7, 0
            sim.store(0x3012, 0b0000110000000001); // brnz 1 ; TAKEN
            sim.store(0x3013, 0b0001110000100001); // add r6, r0, 1

            sim.store(0x3014, 0b0001111111100000); // add r7, r7, 0
            sim.store(0x3015, 0b0000111000000001); // brnzp 1 ; TAKEN
            sim.store(0x3016, 0b0001111000100001); // add r7, r0, 1
            sim.store(0x3017, 0xf025); // halt
            sim.run();

            expect(sim.halted).toBe(true);
            expect(sim.pc).toEqual(0x3018);
            expect(sim.regs).toEqual({
                solo: {'cc': 0b100},
                range: {'r': [
                    0x0000, 0x0001, 0x0001, 0x0001,
                    0x0000, 0x0000, 0x0000, 0xffff,
                ]},
            });
        });

        it('executes conditional branch instructions with cc=z', () => {
            sim.store(0x3000, 0b0101000000100000); // and r0, r0, 0
            sim.store(0x3001, 0b0001111000100000); // add r7, r0, 0

            sim.store(0x3002, 0b0001111111100000); // add r7, r7, 0
            sim.store(0x3003, 0b0000001000000001); // brp 1 ; NOT TAKEN
            sim.store(0x3004, 0b0001001000100001); // add r1, r0, 1

            sim.store(0x3005, 0b0001111111100000); // add r7, r7, 0
            sim.store(0x3006, 0b0000010000000001); // brz 1 ; TAKEN
            sim.store(0x3007, 0b0001010000100001); // add r2, r0, 1

            sim.store(0x3008, 0b0001111111100000); // add r7, r7, 0
            sim.store(0x3009, 0b0000011000000001); // brzp 1 ; TAKEN
            sim.store(0x300a, 0b0001011000100001); // add r3, r0, 1

            sim.store(0x300b, 0b0001111111100000); // add r7, r7, 0
            sim.store(0x300c, 0b0000100000000001); // brn 1 ; NOT TAKEN
            sim.store(0x300d, 0b0001100000100001); // add r4, r0, 1

            sim.store(0x300e, 0b0001111111100000); // add r7, r7, 0
            sim.store(0x300f, 0b0000101000000001); // brnp 1 ; NOT TAKEN
            sim.store(0x3010, 0b0001101000100001); // add r5, r0, 1

            sim.store(0x3011, 0b0001111111100000); // add r7, r7, 0
            sim.store(0x3012, 0b0000110000000001); // brnz 1 ; TAKEN
            sim.store(0x3013, 0b0001110000100001); // add r6, r0, 1

            sim.store(0x3014, 0b0001111111100000); // add r7, r7, 0
            sim.store(0x3015, 0b0000111000000001); // brnzp 1 ; TAKEN
            sim.store(0x3016, 0b0001111000100001); // add r7, r0, 1
            sim.store(0x3017, 0xf025); // halt
            sim.run();

            expect(sim.halted).toBe(true);
            expect(sim.pc).toEqual(0x3018);
            expect(sim.regs).toEqual({
                solo: {'cc': 0b010},
                range: {'r': [
                    0x0000, 0x0001, 0x0000, 0x0000,
                    0x0001, 0x0001, 0x0000, 0x0000,
                ]},
            });
        });

        it('executes conditional branch instructions with cc=p', () => {
            sim.store(0x3000, 0b0101000000100000); // and r0, r0, 0
            sim.store(0x3001, 0b0001111000101111); // add r7, r0, 15

            sim.store(0x3002, 0b0001111111100000); // add r7, r7, 0
            sim.store(0x3003, 0b0000001000000001); // brp 1 ; TAKEN
            sim.store(0x3004, 0b0001001000100001); // add r1, r0, 1

            sim.store(0x3005, 0b0001111111100000); // add r7, r7, 0
            sim.store(0x3006, 0b0000010000000001); // brz 1 ; NOT TAKEN
            sim.store(0x3007, 0b0001010000100001); // add r2, r0, 1

            sim.store(0x3008, 0b0001111111100000); // add r7, r7, 0
            sim.store(0x3009, 0b0000011000000001); // brzp 1 ; TAKEN
            sim.store(0x300a, 0b0001011000100001); // add r3, r0, 1

            sim.store(0x300b, 0b0001111111100000); // add r7, r7, 0
            sim.store(0x300c, 0b0000100000000001); // brn 1 ; NOT TAKEN
            sim.store(0x300d, 0b0001100000100001); // add r4, r0, 1

            sim.store(0x300e, 0b0001111111100000); // add r7, r7, 0
            sim.store(0x300f, 0b0000101000000001); // brnp 1 ; TAKEN
            sim.store(0x3010, 0b0001101000100001); // add r5, r0, 1

            sim.store(0x3011, 0b0001111111100000); // add r7, r7, 0
            sim.store(0x3012, 0b0000110000000001); // brnz 1 ; NOT TAKEN
            sim.store(0x3013, 0b0001110000100001); // add r6, r0, 1

            sim.store(0x3014, 0b0001111111100000); // add r7, r7, 0
            sim.store(0x3015, 0b0000111000000001); // brnzp 1 ; TAKEN
            sim.store(0x3016, 0b0001111000100001); // add r7, r0, 1
            sim.store(0x3017, 0xf025); // halt
            sim.run();

            expect(sim.halted).toBe(true);
            expect(sim.pc).toEqual(0x3018);
            expect(sim.regs).toEqual({
                solo: {'cc': 0b001},
                range: {'r': [
                    0x0000, 0x0000, 0x0001, 0x0000,
                    0x0001, 0x0000, 0x0001, 0x000f,
                ]},
            });
        });

        it('executes loads', () => {
            sim.store(0x3000, 0b0010011000000101); // ld r3, nice
            sim.store(0x3001, 0b1110100000000100); // lea r4, nice
            sim.store(0x3002, 0b0001100100111110); // add r4, r4, -2
            sim.store(0x3003, 0b0110101100000010); // ldr r5, r4, 2
            sim.store(0x3004, 0b1010110000000010); // ldi r6, niceaddr
            sim.store(0x3005, 0xf025); // halt
            sim.store(0x3006, 0x0069); // nice .fill x69
            sim.store(0x3007, 0x3006); // niceaddr .fill nice
            sim.run();

            expect(sim.halted).toBe(true);
            expect(sim.pc).toEqual(0x3006);
            expect(sim.regs).toEqual({
                solo: {'cc': 0b001},
                range: {'r': [
                    0x0000, 0x0000, 0x0000, 0x0069,
                    0x3004, 0x0069, 0x0069, 0x0000,
                ]},
            });
        });

        it('executes stores', () => {
            sim.store(0x3000, 0b0101111111100000); // and r7, r7, 0
            sim.store(0x3001, 0b0001111111101111); // add r7, r7, 15
            sim.store(0x3002, 0b0001111111101111); // add r7, r7, 15
            sim.store(0x3003, 0b0001111111101111); // add r7, r7, 15
            sim.store(0x3004, 0b0001111111101111); // add r7, r7, 15
            sim.store(0x3005, 0b0001111111101111); // add r7, r7, 15
            sim.store(0x3006, 0b0001111111101111); // add r7, r7, 15
            sim.store(0x3007, 0b0001111111101111); // add r7, r7, 15

            sim.store(0x3008, 0b0011111000000101); // st r7, nice
            sim.store(0x3009, 0b1110100000000111); // lea r4, nice3
            sim.store(0x300a, 0b0001100100111110); // add r4, r4, -2
            sim.store(0x300b, 0b0111111100000010); // str r7, r4, 2
            sim.store(0x300c, 0b1011111000000010); // sti r7, nice2addr
            sim.store(0x300d, 0xf025); // halt
            sim.store(0x300e, 0x0420); // nice .fill x0420
            sim.store(0x300f, 0x3010); // nice2addr .fill nice
            sim.store(0x3010, 0x0420); // nice2 .fill x0420
            sim.store(0x3011, 0x0420); // nice3 .fill x0420
            sim.run();

            expect(sim.halted).toBe(true);
            expect(sim.pc).toEqual(0x300e);
            expect(sim.regs).toEqual({
                solo: {'cc': 0b001},
                range: {'r': [
                    0x0000, 0x0000, 0x0000, 0x0000,
                    0x300f, 0x0000, 0x0000, 0x0069,
                ]},
            });
            expect(sim.load(0x300e)).toEqual(0x0069);
            expect(sim.load(0x3010)).toEqual(0x0069);
            expect(sim.load(0x3011)).toEqual(0x0069);
        });

        it('executes getc', () => {
            stdin = 'asdf';

            sim.store(0x3000, 0xf020); // getc
            sim.store(0x3001, 0xf025); // halt
            sim.run();

            expect(sim.halted).toBe(true);
            expect(sim.pc).toEqual(0x3002);
            expect(sim.regs).toEqual({
                // LC-3 ISA is ambiguous, but does not appear to
                // update CC
                solo: {'cc': 0b000},
                range: {'r': [
                    0x0061, 0x0000, 0x0000, 0x0000,
                    0x0000, 0x0000, 0x0000, 0x0000,
                ]},
            });
            // Did not touch stdout
            expect(stdout).toEqual('');
        });

        it('executes out', () => {
            sim.store(0x3000, 0b0101000000100000); // and r0, r0, 0
            sim.store(0x3001, 0b0001000000101111); // add r0, r0, 15
            sim.store(0x3002, 0b0001000000101111); // add r0, r0, 15
            sim.store(0x3003, 0b0001000000100011); // add r0, r0, 3
            sim.store(0x3004, 0xf021); // out
            sim.store(0x3005, 0xf025); // halt
            sim.run();

            expect(sim.halted).toBe(true);
            expect(sim.pc).toEqual(0x3006);
            expect(sim.regs).toEqual({
                solo: {'cc': 0b001},
                range: {'r': [
                    0x0021, 0x0000, 0x0000, 0x0000,
                    0x0000, 0x0000, 0x0000, 0x0000,
                ]},
            });
            expect(stdout).toEqual('!');
        });

        it('executes out on R0[7:0]', () => {
            sim.store(0x3000, 0b0101000000100000); // and r0, r0, 0
            sim.store(0x3001, 0b0001000000100001); // add r0, r0, 1
            sim.store(0x3002, 0b0001000000000000); // add r0, r0, r0
            sim.store(0x3003, 0b0001000000000000); // add r0, r0, r0
            sim.store(0x3004, 0b0001000000000000); // add r0, r0, r0
            sim.store(0x3005, 0b0001000000000000); // add r0, r0, r0
            sim.store(0x3006, 0b0001000000000000); // add r0, r0, r0
            sim.store(0x3007, 0b0001000000000000); // add r0, r0, r0
            sim.store(0x3008, 0b0001000000000000); // add r0, r0, r0
            sim.store(0x3009, 0b0001000000000000); // add r0, r0, r0
            sim.store(0x300a, 0b0001000000101111); // add r0, r0, 15
            sim.store(0x300b, 0b0001000000101111); // add r0, r0, 15
            sim.store(0x300c, 0b0001000000100011); // add r0, r0, 3
            sim.store(0x300d, 0xf021); // out
            sim.store(0x300e, 0xf025); // halt
            sim.run();

            expect(sim.halted).toBe(true);
            expect(sim.pc).toEqual(0x300f);
            expect(sim.regs).toEqual({
                solo: {'cc': 0b001},
                range: {'r': [
                    0x0121, 0x0000, 0x0000, 0x0000,
                    0x0000, 0x0000, 0x0000, 0x0000,
                ]},
            });
            expect(stdout).toEqual('!');
        });

        it('executes in', () => {
            stdin = 'banana';

            sim.store(0x3000, 0xf023); // out
            sim.store(0x3001, 0xf025); // halt
            sim.run();

            expect(sim.halted).toBe(true);
            expect(sim.pc).toEqual(0x3002);
            expect(sim.regs).toEqual({
                // LC-3 ISA is ambiguous, but does not appear to
                // update CC
                solo: {'cc': 0b000},
                range: {'r': [
                    0x0062, 0x0000, 0x0000, 0x0000,
                    0x0000, 0x0000, 0x0000, 0x0000,
                ]},
            });
            expect(stdout).toEqual('> ');
        });

        it('errors on invalid instruction', () => {
            sim.store(0x3000, 0b1101000000000000);
            expect(() => {
                sim.run();
            }).toThrow(/0xD000/i);
        });
    });
});
