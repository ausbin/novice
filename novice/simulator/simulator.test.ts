import { Simulator } from '.';
import { getIsa } from '../isa';
import { FakeIO } from './helpers.test';

describe('simulator', () => {
    let io: FakeIO;
    let sim: Simulator;

    beforeEach(() => {
        io = new FakeIO();
    });

    describe('lc-3 programs', () => {
        beforeEach(() => {
            sim = new Simulator(getIsa('lc3'), io);
        });

        describe('halt', () => {
            beforeEach(() => {
                sim.store(0x3000, 0xf025); // halt
            });

            it('unstep() at beginning of time', () => {
                expect(() => {
                    sim.unstep();
                }).toThrow('beginning of time');
            });

            it('explodes reg() on invalid reg range', () => {
                expect(() => {
                    sim.reg(['x', 69]);
                }).toThrow('x');
            });

            it('explodes reg() on invalid solo reg', () => {
                expect(() => {
                    sim.reg('lmao');
                }).toThrow('lmao');
            });

            it('run()', () => {
                return sim.run().then(() => {
                    expect(sim.isHalted()).toBe(true);
                    expect(sim.getPc()).toEqual(0x3001);
                });
            });

            it('rewind()', () => {
                return sim.run().then(() => {
                    sim.rewind();
                    expect(sim.isHalted()).toBe(false);
                    expect(sim.getPc()).toEqual(0x3000);
                });
            });
        });

        describe('adding two numbers', () => {
            beforeEach(() => {
                sim.store(0x3000, 0b0101001001100000); // and r1, r1, 0
                sim.store(0x3001, 0b0101010010100000); // and r2, r2, 0
                sim.store(0x3002, 0b0001001001101111); // add r1, r1, 15
                sim.store(0x3003, 0b0001010010100011); // add r2, r2, 3
                sim.store(0x3004, 0b0001111001000010); // add r7, r1, r2
                sim.store(0x3005, 0xf025); // halt
            });

            it('run()', () => {
                return sim.run().then(() => {
                    expect(sim.isHalted()).toBe(true);
                    expect(sim.getPc()).toEqual(0x3006);
                    expect(sim.getRegs()).toEqual({
                        solo: {'cc': 0b001},
                        range: {'r': [
                            0x0000, 0x000f, 0x0003, 0x0000,
                            0x0000, 0x0000, 0x0000, 0x0012,
                        ]},
                    });
                });
            });

            it('rewind()', () => {
                return sim.run().then(() => {
                    sim.rewind();
                    expect(sim.isHalted()).toBe(false);
                    expect(sim.getPc()).toEqual(0x3000);
                    expect(sim.getRegs()).toEqual({
                        solo: {'cc': 0b000},
                        range: {'r': [
                            0x0000, 0x0000, 0x0000, 0x0000,
                            0x0000, 0x0000, 0x0000, 0x0000,
                        ]},
                    });
                });
            });
        });

        describe('printing hello world', () => {
            beforeEach(() => {
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
            });

            it('run()', () => {
                return sim.run().then(() => {
                    expect(sim.isHalted()).toBe(true);
                    expect(sim.getPc()).toEqual(0x3003);
                    expect(sim.getRegs()).toEqual({
                        solo: {'cc': 0b001},
                        range: {'r': [
                            0x3003, 0x0000, 0x0000, 0x0000,
                            0x0000, 0x0000, 0x0000, 0x0000,
                        ]},
                    });
                    expect(io.stdout).toEqual("hello world!\n");
                });
            });

            it('rewind()', () => {
                return sim.run().then(() => {
                    sim.rewind();
                    expect(sim.isHalted()).toBe(false);
                    expect(sim.getPc()).toEqual(0x3000);
                    expect(sim.getRegs()).toEqual({
                        solo: {'cc': 0b000},
                        range: {'r': [
                            0x0000, 0x0000, 0x0000, 0x0000,
                            0x0000, 0x0000, 0x0000, 0x0000,
                        ]},
                    });
                });
            });
        });

        describe('setting CC=n', () => {
            beforeEach(() => {
                sim.store(0x3000, 0b0101001001100000); // and r1, r1, 0
                sim.store(0x3001, 0b0001001001111110); // add r1, r1, -2
                sim.store(0x3002, 0xf025); // halt
            });

            it('run()', () => {
                return sim.run().then(() => {
                    expect(sim.isHalted()).toBe(true);
                    expect(sim.getPc()).toEqual(0x3003);
                    expect(sim.getRegs()).toEqual({
                        solo: {'cc': 0b100},
                        range: {'r': [
                            0x0000, 0xfffe, 0x0000, 0x0000,
                            0x0000, 0x0000, 0x0000, 0x0000,
                        ]},
                    });
                });
            });

            it('rewind()', () => {
                return sim.run().then(() => {
                    sim.rewind();
                    expect(sim.isHalted()).toBe(false);
                    expect(sim.getPc()).toEqual(0x3000);
                    expect(sim.getRegs()).toEqual({
                        solo: {'cc': 0b000},
                        range: {'r': [
                            0x0000, 0x0000, 0x0000, 0x0000,
                            0x0000, 0x0000, 0x0000, 0x0000,
                        ]},
                    });
                });
            });
        });

        describe('setting CC=z', () => {
            beforeEach(() => {
                sim.store(0x3000, 0b0101001001100000); // and r1, r1, 0
                sim.store(0x3001, 0xf025); // halt
            });

            it('run()', () => {
                return sim.run().then(() => {
                    expect(sim.isHalted()).toBe(true);
                    expect(sim.getPc()).toEqual(0x3002);
                    expect(sim.getRegs()).toEqual({
                        solo: {'cc': 0b010},
                        range: {'r': [
                            0x0000, 0x0000, 0x0000, 0x0000,
                            0x0000, 0x0000, 0x0000, 0x0000,
                        ]},
                    });
                });
            });

            it('rewind()', () => {
                return sim.run().then(() => {
                    sim.rewind();
                    expect(sim.isHalted()).toBe(false);
                    expect(sim.getPc()).toEqual(0x3000);
                    expect(sim.getRegs()).toEqual({
                        solo: {'cc': 0b000},
                        range: {'r': [
                            0x0000, 0x0000, 0x0000, 0x0000,
                            0x0000, 0x0000, 0x0000, 0x0000,
                        ]},
                    });
                });
            });
        });

        describe('setting CC=p', () => {
            beforeEach(() => {
                sim.store(0x3000, 0b0101001001100000); // and r1, r1, 0
                sim.store(0x3001, 0b0001001001100010); // add r1, r1, 2
                sim.store(0x3002, 0xf025); // halt
            });

            it('run()', () => {
                return sim.run().then(() => {
                    expect(sim.isHalted()).toBe(true);
                    expect(sim.getPc()).toEqual(0x3003);
                    expect(sim.getRegs()).toEqual({
                        solo: {'cc': 0b001},
                        range: {'r': [
                            0x0000, 0x0002, 0x0000, 0x0000,
                            0x0000, 0x0000, 0x0000, 0x0000,
                        ]},
                    });
                });
            });

            it('rewind()', () => {
                return sim.run().then(() => {
                    sim.rewind();
                    expect(sim.isHalted()).toBe(false);
                    expect(sim.getPc()).toEqual(0x3000);
                    expect(sim.getRegs()).toEqual({
                        solo: {'cc': 0b000},
                        range: {'r': [
                            0x0000, 0x0000, 0x0000, 0x0000,
                            0x0000, 0x0000, 0x0000, 0x0000,
                        ]},
                    });
                });
            });
        });

        describe('arithmetic', () => {
            beforeEach(() => {
                sim.store(0x3000, 0b0101000000100000); // and r0, r0, 0
                sim.store(0x3001, 0b0001010000101100); // add r2, r0, 12
                sim.store(0x3002, 0b1001011010111111); // not r3, r2
                sim.store(0x3003, 0b1001100000111111); // not r4, r0
                sim.store(0x3004, 0b0101101011000100); // and r5, r3, r4
                sim.store(0x3005, 0xf025); // halt
            });

            it('run()', () => {
                return sim.run().then(() => {
                    expect(sim.isHalted()).toBe(true);
                    expect(sim.getPc()).toEqual(0x3006);
                    expect(sim.getRegs()).toEqual({
                        solo: {'cc': 0b100},
                        range: {'r': [
                            0x0000, 0x0000, 0x000c, 0xfff3,
                            0xffff, 0xfff3, 0x0000, 0x0000,
                        ]},
                    });
                });
            });

            it('rewind()', () => {
                return sim.run().then(() => {
                    sim.rewind();
                    expect(sim.isHalted()).toBe(false);
                    expect(sim.getPc()).toEqual(0x3000);
                    expect(sim.getRegs()).toEqual({
                        solo: {'cc': 0b000},
                        range: {'r': [
                            0x0000, 0x0000, 0x0000, 0x0000,
                            0x0000, 0x0000, 0x0000, 0x0000,
                        ]},
                    });
                });
            });
        });

        describe('unconditional branching', () => {
            beforeEach(() => {
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
            });

            it('run()', () => {
                return sim.run().then(() => {
                    expect(sim.isHalted()).toBe(true);
                    expect(sim.getPc()).toEqual(0x300d);
                    expect(sim.getRegs()).toEqual({
                        solo: {'cc': 0b001},
                        range: {'r': [
                            0x0000, 0x0000, 0x0000, 0x0000,
                            0x0000, 0x300b, 0x3008, 0x3007,
                        ]},
                    });
                });
            });

            it('rewind()', () => {
                return sim.run().then(() => {
                    sim.rewind();
                    expect(sim.isHalted()).toBe(false);
                    expect(sim.getPc()).toEqual(0x3000);
                    expect(sim.getRegs()).toEqual({
                        solo: {'cc': 0b000},
                        range: {'r': [
                            0x0000, 0x0000, 0x0000, 0x0000,
                            0x0000, 0x0000, 0x0000, 0x0000,
                        ]},
                    });
                });
            });
        });

        describe('true traps', () => {
            beforeEach(() => {
                sim.store(0x00f0, 0x2000); // trap table

                sim.store(0x2000, 0b0001010000000001); // add r2, r0, r1
                sim.store(0x2001, 0b1100000111000000); // ret

                sim.store(0x3000, 0b0101000000100000); // and r0, r0, 0
                sim.store(0x3001, 0b0001001000100010); // add r1, r0, 2
                sim.store(0x3002, 0b0001000000101101); // add r0, r0, 13
                sim.store(0x3003, 0xf0f0); // trap xf0
                sim.store(0x3004, 0xf025); // halt
            });

            it('run()', () => {
                return sim.run().then(() => {
                    expect(sim.isHalted()).toBe(true);
                    expect(sim.getPc()).toEqual(0x3005);
                    expect(sim.getRegs()).toEqual({
                        solo: {'cc': 0b001},
                        range: {'r': [
                            0x000d, 0x0002, 0x000f, 0x0000,
                            0x0000, 0x0000, 0x0000, 0x3004,
                        ]},
                    });
                });
            });

            it('rewind()', () => {
                return sim.run().then(() => {
                    sim.rewind();
                    expect(sim.isHalted()).toBe(false);
                    expect(sim.getPc()).toEqual(0x3000);
                    expect(sim.getRegs()).toEqual({
                        solo: {'cc': 0b000},
                        range: {'r': [
                            0x0000, 0x0000, 0x0000, 0x0000,
                            0x0000, 0x0000, 0x0000, 0x0000,
                        ]},
                    });
                });
            });
        });

        describe('conditional branching with cc=n', () => {
            beforeEach(() => {
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
            });

            it('run()', () => {
                return sim.run().then(() => {
                    expect(sim.isHalted()).toBe(true);
                    expect(sim.getPc()).toEqual(0x3018);
                    expect(sim.getRegs()).toEqual({
                        solo: {'cc': 0b100},
                        range: {'r': [
                            0x0000, 0x0001, 0x0001, 0x0001,
                            0x0000, 0x0000, 0x0000, 0xffff,
                        ]},
                    });
                });
            });

            it('rewind()', () => {
                return sim.run().then(() => {
                    sim.rewind();
                    expect(sim.isHalted()).toBe(false);
                    expect(sim.getPc()).toEqual(0x3000);
                    expect(sim.getRegs()).toEqual({
                        solo: {'cc': 0b000},
                        range: {'r': [
                            0x0000, 0x0000, 0x0000, 0x0000,
                            0x0000, 0x0000, 0x0000, 0x0000,
                        ]},
                    });
                });
            });
        });

        describe('conditional branching with cc=z', () => {
            beforeEach(() => {
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
            });

            it('run()', () => {
                return sim.run().then(() => {
                    expect(sim.isHalted()).toBe(true);
                    expect(sim.getPc()).toEqual(0x3018);
                    expect(sim.getRegs()).toEqual({
                        solo: {'cc': 0b010},
                        range: {'r': [
                            0x0000, 0x0001, 0x0000, 0x0000,
                            0x0001, 0x0001, 0x0000, 0x0000,
                        ]},
                    });
                });
            });

            it('rewind()', () => {
                return sim.run().then(() => {
                    sim.rewind();
                    expect(sim.isHalted()).toBe(false);
                    expect(sim.getPc()).toEqual(0x3000);
                    expect(sim.getRegs()).toEqual({
                        solo: {'cc': 0b000},
                        range: {'r': [
                            0x0000, 0x0000, 0x0000, 0x0000,
                            0x0000, 0x0000, 0x0000, 0x0000,
                        ]},
                    });
                });
            });
        });

        describe('executes conditional branch instructions with cc=p', () => {
            beforeEach(() => {
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
            });

            it('run()', () => {
                return sim.run().then(() => {
                    expect(sim.isHalted()).toBe(true);
                    expect(sim.getPc()).toEqual(0x3018);
                    expect(sim.getRegs()).toEqual({
                        solo: {'cc': 0b001},
                        range: {'r': [
                            0x0000, 0x0000, 0x0001, 0x0000,
                            0x0001, 0x0000, 0x0001, 0x000f,
                        ]},
                    });
                });
            });

            it('rewind()', () => {
                return sim.run().then(() => {
                    sim.rewind();
                    expect(sim.isHalted()).toBe(false);
                    expect(sim.getPc()).toEqual(0x3000);
                    expect(sim.getRegs()).toEqual({
                        solo: {'cc': 0b000},
                        range: {'r': [
                            0x0000, 0x0000, 0x0000, 0x0000,
                            0x0000, 0x0000, 0x0000, 0x0000,
                        ]},
                    });
                });
            });
        });

        describe('loading', () => {
            beforeEach(() => {
                sim.store(0x3000, 0b0010011000000101); // ld r3, nice
                sim.store(0x3001, 0b1110100000000100); // lea r4, nice
                sim.store(0x3002, 0b0001100100111110); // add r4, r4, -2
                sim.store(0x3003, 0b0110101100000010); // ldr r5, r4, 2
                sim.store(0x3004, 0b1010110000000010); // ldi r6, niceaddr
                sim.store(0x3005, 0xf025); // halt
                sim.store(0x3006, 0x0069); // nice .fill x69
                sim.store(0x3007, 0x3006); // niceaddr .fill nice
            });

            it('run()', () => {
                return sim.run().then(() => {
                    expect(sim.isHalted()).toBe(true);
                    expect(sim.getPc()).toEqual(0x3006);
                    expect(sim.getRegs()).toEqual({
                        solo: {'cc': 0b001},
                        range: {'r': [
                            0x0000, 0x0000, 0x0000, 0x0069,
                            0x3004, 0x0069, 0x0069, 0x0000,
                        ]},
                    });
                });
            });

            it('rewind()', () => {
                return sim.run().then(() => {
                    sim.rewind();
                    expect(sim.isHalted()).toBe(false);
                    expect(sim.getPc()).toEqual(0x3000);
                    expect(sim.getRegs()).toEqual({
                        solo: {'cc': 0b000},
                        range: {'r': [
                            0x0000, 0x0000, 0x0000, 0x0000,
                            0x0000, 0x0000, 0x0000, 0x0000,
                        ]},
                    });
                });
            });
        });

        describe('storing', () => {
            beforeEach(() => {
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
            });

            it('run()', () => {
                return sim.run().then(() => {
                    expect(sim.isHalted()).toBe(true);
                    expect(sim.getPc()).toEqual(0x300e);
                    expect(sim.getRegs()).toEqual({
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
            });

            it('rewind()', () => {
                return sim.run().then(() => {
                    sim.rewind();
                    expect(sim.isHalted()).toBe(false);
                    expect(sim.getPc()).toEqual(0x3000);
                    expect(sim.getRegs()).toEqual({
                        solo: {'cc': 0b000},
                        range: {'r': [
                            0x0000, 0x0000, 0x0000, 0x0000,
                            0x0000, 0x0000, 0x0000, 0x0000,
                        ]},
                    });
                });
            });
        });

        describe('getc', () => {
            beforeEach(() => {
                io.stdin = 'asdf';

                sim.store(0x3000, 0xf020); // getc
                sim.store(0x3001, 0xf025); // halt
            });

            it('run()', () => {
                return sim.run().then(() => {
                    expect(sim.isHalted()).toBe(true);
                    expect(sim.getPc()).toEqual(0x3002);
                    expect(sim.getRegs()).toEqual({
                        // LC-3 ISA is ambiguous, but does not appear to
                        // update CC
                        solo: {'cc': 0b000},
                        range: {'r': [
                            0x0061, 0x0000, 0x0000, 0x0000,
                            0x0000, 0x0000, 0x0000, 0x0000,
                        ]},
                    });
                    // Did not touch io.stdout
                    expect(io.stdout).toEqual('');
                });
            });

            it('rewind()', () => {
                return sim.run().then(() => {
                    sim.rewind();
                    expect(sim.isHalted()).toBe(false);
                    expect(sim.getPc()).toEqual(0x3000);
                    expect(sim.getRegs()).toEqual({
                        solo: {'cc': 0b000},
                        range: {'r': [
                            0x0000, 0x0000, 0x0000, 0x0000,
                            0x0000, 0x0000, 0x0000, 0x0000,
                        ]},
                    });
                });
            });
        });

        describe('out', () => {
            beforeEach(() => {
                sim.store(0x3000, 0b0101000000100000); // and r0, r0, 0
                sim.store(0x3001, 0b0001000000101111); // add r0, r0, 15
                sim.store(0x3002, 0b0001000000101111); // add r0, r0, 15
                sim.store(0x3003, 0b0001000000100011); // add r0, r0, 3
                sim.store(0x3004, 0xf021); // out
                sim.store(0x3005, 0xf025); // halt
            });

            it('run()', () => {
                return sim.run().then(() => {
                    expect(sim.isHalted()).toBe(true);
                    expect(sim.getPc()).toEqual(0x3006);
                    expect(sim.getRegs()).toEqual({
                        solo: {'cc': 0b001},
                        range: {'r': [
                            0x0021, 0x0000, 0x0000, 0x0000,
                            0x0000, 0x0000, 0x0000, 0x0000,
                        ]},
                    });
                    expect(io.stdout).toEqual('!');
                });
            });

            it('rewind()', () => {
                return sim.run().then(() => {
                    sim.rewind();
                    expect(sim.isHalted()).toBe(false);
                    expect(sim.getPc()).toEqual(0x3000);
                    expect(sim.getRegs()).toEqual({
                        solo: {'cc': 0b000},
                        range: {'r': [
                            0x0000, 0x0000, 0x0000, 0x0000,
                            0x0000, 0x0000, 0x0000, 0x0000,
                        ]},
                    });
                });
            });
        });

        describe('out on R0[7:0]', () => {
            beforeEach(() => {
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
            });

            it('run()', () => {
                return sim.run().then(() => {
                    expect(sim.isHalted()).toBe(true);
                    expect(sim.getPc()).toEqual(0x300f);
                    expect(sim.getRegs()).toEqual({
                        solo: {'cc': 0b001},
                        range: {'r': [
                            0x0121, 0x0000, 0x0000, 0x0000,
                            0x0000, 0x0000, 0x0000, 0x0000,
                        ]},
                    });
                    expect(io.stdout).toEqual('!');
                });
            });

            it('rewind()', () => {
                return sim.run().then(() => {
                    sim.rewind();
                    expect(sim.isHalted()).toBe(false);
                    expect(sim.getPc()).toEqual(0x3000);
                    expect(sim.getRegs()).toEqual({
                        solo: {'cc': 0b000},
                        range: {'r': [
                            0x0000, 0x0000, 0x0000, 0x0000,
                            0x0000, 0x0000, 0x0000, 0x0000,
                        ]},
                    });
                });
            });
        });


        describe('in', () => {
            beforeEach(() => {
                io.stdin = 'banana';

                sim.store(0x3000, 0xf023); // out
                sim.store(0x3001, 0xf025); // halt
            });

            it('run()', () => {
                return sim.run().then(() => {
                    expect(sim.isHalted()).toBe(true);
                    expect(sim.getPc()).toEqual(0x3002);
                    expect(sim.getRegs()).toEqual({
                        // LC-3 ISA is ambiguous, but does not appear to
                        // update CC
                        solo: {'cc': 0b000},
                        range: {'r': [
                            0x0062, 0x0000, 0x0000, 0x0000,
                            0x0000, 0x0000, 0x0000, 0x0000,
                        ]},
                    });
                    expect(io.stdout).toEqual('> ');
                });
            });

            it('rewind()', () => {
                return sim.run().then(() => {
                    sim.rewind();
                    expect(sim.isHalted()).toBe(false);
                    expect(sim.getPc()).toEqual(0x3000);
                    expect(sim.getRegs()).toEqual({
                        solo: {'cc': 0b000},
                        range: {'r': [
                            0x0000, 0x0000, 0x0000, 0x0000,
                            0x0000, 0x0000, 0x0000, 0x0000,
                        ]},
                    });
                });
            });
        });

        describe('errors on invalid instruction', () => {
            beforeEach(() => {
                sim.store(0x3000, 0b1101000000000000);
            });

            it('run()', () => {
                return expect(sim.run()).rejects.toThrow(/0xD000/i);
            });
        });

        describe('adding after halt', () => {
            beforeEach(() => {
                sim.store(0x3000, 0xf025); // halt
                sim.store(0x3001, 0b0001000000100001); // add r0, r0, 1
            });

            it('step() should not double step', () => {
                sim.step();
                expect(sim.isHalted()).toBe(true);
                expect(sim.getPc()).toEqual(0x3001);
                expect(sim.getRegs()).toEqual({
                    solo: {'cc': 0b000},
                    range: {'r': [
                        0x0000, 0x0000, 0x0000, 0x0000,
                        0x0000, 0x0000, 0x0000, 0x0000,
                    ]},
                });

                sim.step();
                // Stepping should not change state (because should not execute
                // the add)
                expect(sim.isHalted()).toBe(true);
                expect(sim.getPc()).toEqual(0x3001);
                expect(sim.getRegs()).toEqual({
                    solo: {'cc': 0b000},
                    range: {'r': [
                        0x0000, 0x0000, 0x0000, 0x0000,
                        0x0000, 0x0000, 0x0000, 0x0000,
                    ]},
                });
            });
        });
    });

    describe('lc-2200 programs', () => {
        beforeEach(() => {
            sim = new Simulator(getIsa('lc2200'), io);
        });

        describe('halt', () => {
            beforeEach(() => {
                sim.store(0x00, 0x70000000); // halt
            });

            it('run()', () => {
                return sim.run().then(() => {
                    expect(sim.isHalted()).toBe(true);
                    expect(sim.getPc()).toEqual(0x01);
                });
            });

            it('rewind()', () => {
                return sim.run().then(() => {
                    sim.rewind();
                    expect(sim.isHalted()).toBe(false);
                    expect(sim.getPc()).toEqual(0x00);
                    expect(sim.getRegs()).toEqual({solo: {}, range: {'$': [
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                    ]}});
                });
            });
        });

        describe('adding two numbers', () => {
            beforeEach(() => {
                sim.store(0x00, 0x2100000f); // addi $1, $0, 15
                sim.store(0x01, 0x22000003); // addi $2, $0, 3
                sim.store(0x02, 0x03100002); // add $3, $1, $2
                sim.store(0x03, 0x05300002); // add $5, $3, $2
                sim.store(0x04, 0x70000000); // halt
            });

            it('run()', () => {
                return sim.run().then(() => {
                    expect(sim.isHalted()).toBe(true);
                    expect(sim.getPc()).toEqual(0x05);
                    expect(sim.getRegs()).toEqual({solo: {}, range: {'$': [
                        0x00000000, 0x0000000f, 0x00000003, 0x00000012,
                        0x00000000, 0x00000015, 0x00000000, 0x00000000,
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                    ]}});
                });
            });

            it('rewind()', () => {
                return sim.run().then(() => {
                    sim.rewind();
                    expect(sim.isHalted()).toBe(false);
                    expect(sim.getPc()).toEqual(0x00);
                    expect(sim.getRegs()).toEqual({solo: {}, range: {'$': [
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                    ]}});
                });
            });
        });

        describe('arithmetic', () => {
            beforeEach(() => {
                sim.store(0x00, 0x2a000045); // add $10, $0, 69
                sim.store(0x01, 0x17a0000a); // nand $7, $10, $10
                sim.store(0x02, 0x25700003); // addi $5, $7, 3
                sim.store(0x03, 0x00000000); // nop
                sim.store(0x04, 0x227ffffe); // addi $2, $7, -2
                sim.store(0x05, 0x0f200005); // add $15, $2, $5
                sim.store(0x06, 0x70000000); // halt
            });

            it('run()', () => {
                return sim.run().then(() => {
                    expect(sim.isHalted()).toBe(true);
                    expect(sim.getPc()).toEqual(0x07);
                    expect(sim.getRegs()).toEqual({solo: {}, range: {'$': [
                        0x00000000, 0x00000000, 0xffffffb8 & -1, 0x00000000,
                        0x00000000, 0xffffffbd & -1, 0x00000000, 0xffffffba & -1,
                        0x00000000, 0x00000000, 0x00000045, 0x00000000,
                        0x00000000, 0x00000000, 0x00000000, 0xffffff75 & -1,
                    ]}});
                });
            });

            it('rewind()', () => {
                return sim.run().then(() => {
                    sim.rewind();
                    expect(sim.isHalted()).toBe(false);
                    expect(sim.getPc()).toEqual(0x00);
                    expect(sim.getRegs()).toEqual({solo: {}, range: {'$': [
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                    ]}});
                });
            });
        });

        describe('conditional branching', () => {
            beforeEach(() => {
                sim.store(0x00, 0x2d000001); // addi $13, $0, 1
                sim.store(0x01, 0x2e000002); // addi $14, $0, 2
                sim.store(0x02, 0x2f000002); // addi $15, $0, 2
                sim.store(0x03, 0x5ee00001); // beq $14, $14, 1 ! TAKEN
                sim.store(0x04, 0x21000001); // addi $1, $0, 1
                sim.store(0x05, 0x5ef00001); // beq $14, $15, 1 ! TAKEN
                sim.store(0x06, 0x22000001); // addi $2, $0, 1
                sim.store(0x07, 0x5de00001); // beq $14, $13, 1 ! NOT TAKEN
                sim.store(0x08, 0x23000001); // addi $3, $0, 1
                sim.store(0x09, 0x70000000); // halt
            });

            it('run()', () => {
                return sim.run().then(() => {
                    expect(sim.isHalted()).toBe(true);
                    expect(sim.getPc()).toEqual(0x0a);
                    expect(sim.getRegs()).toEqual({solo: {}, range: {'$': [
                        0x00000000, 0x00000000, 0x00000000, 0x00000001,
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                        0x00000000, 0x00000001, 0x00000002, 0x00000002,
                    ]}});
                });
            });

            it('rewind()', () => {
                return sim.run().then(() => {
                    sim.rewind();
                    expect(sim.isHalted()).toBe(false);
                    expect(sim.getPc()).toEqual(0x00);
                    expect(sim.getRegs()).toEqual({solo: {}, range: {'$': [
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                    ]}});
                });
            });
        });

        describe('executes unconditional branch instructions', () => {
            beforeEach(() => {
                sim.store(0x00, 0x50000001); // beq $0, $0, 1
                sim.store(0x01, 0x21000001); // addi $1, $0, 1
                sim.store(0x02, 0x2f000005); // addi $15, 0, 0x05
                sim.store(0x03, 0x6fe00000); // jalr $15, $14
                sim.store(0x04, 0x22000001); // addi $2, $0, 1
                sim.store(0x05, 0x70000000); // halt
            });

            it('run()', () => {
                return sim.run().then(() => {
                    expect(sim.isHalted()).toBe(true);
                    expect(sim.getPc()).toEqual(0x06);
                    expect(sim.getRegs()).toEqual({solo: {}, range: {'$': [
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                        0x00000000, 0x00000000, 0x00000004, 0x00000005,
                    ]}});
                });
            });

            it('rewind()', () => {
                return sim.run().then(() => {
                    sim.rewind();
                    expect(sim.isHalted()).toBe(false);
                    expect(sim.getPc()).toEqual(0x00);
                    expect(sim.getRegs()).toEqual({solo: {}, range: {'$': [
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                    ]}});
                });
            });
        });

        describe('jalr $x, $x', () => {
            beforeEach(() => {
                sim.store(0x00, 0x2f000003); // addi $15, $0, 0x03
                sim.store(0x01, 0x6ff00000); // jalr $15, $15
                sim.store(0x02, 0x21000001); // addi $1, $0, 1
                sim.store(0x03, 0x70000000); // halt
            });

            it('run()', () => {
                return sim.run().then(() => {
                    expect(sim.isHalted()).toBe(true);
                    expect(sim.getPc()).toEqual(0x04);
                    expect(sim.getRegs()).toEqual({solo: {}, range: {'$': [
                        0x00000000, 0x00000001, 0x00000000, 0x00000000,
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                        0x00000000, 0x00000000, 0x00000000, 0x00000002,
                    ]}});
                });
            });

            it('rewind()', () => {
                return sim.run().then(() => {
                    sim.rewind();
                    expect(sim.isHalted()).toBe(false);
                    expect(sim.getPc()).toEqual(0x00);
                    expect(sim.getRegs()).toEqual({solo: {}, range: {'$': [
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                    ]}});
                });
            });
        });

        describe('loading', () => {
            beforeEach(() => {
                sim.store(0x00, 0x21000006); // addi $1, $0, 0x06
                sim.store(0x01, 0x341fffff); // lw $4, -1($1)
                sim.store(0x02, 0x35100000); // lw $5, 0($1)
                sim.store(0x03, 0x36100001); // lw $6, 1($1)
                sim.store(0x04, 0x70000000); // halt
                sim.store(0x05, 0x00000069); // .word 0x69
                sim.store(0x06, 0x00000420); // .word 0x420
                sim.store(0x07, 0xfffffffe); // .word -2
            });

            it('run()', () => {
                return sim.run().then(() => {
                    expect(sim.isHalted()).toBe(true);
                    expect(sim.getPc()).toEqual(0x05);
                    expect(sim.getRegs()).toEqual({solo: {}, range: {'$': [
                        0x00000000, 0x00000006, 0x00000000, 0x00000000,
                        0x00000069, 0x00000420, 0xfffffffe & -1, 0x00000000,
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                    ]}});
                });
            });

            it('rewind()', () => {
                return sim.run().then(() => {
                    sim.rewind();
                    expect(sim.isHalted()).toBe(false);
                    expect(sim.getPc()).toEqual(0x00);
                    expect(sim.getRegs()).toEqual({solo: {}, range: {'$': [
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                    ]}});
                });
            });
        });

        describe('executes stores', () => {
            beforeEach(() => {
                sim.store(0x00, 0x21000008); // addi $1, $0, 0x08
                sim.store(0x01, 0x220ffffe); // addi $2, $0, -2
                sim.store(0x02, 0x23000420); // addi $3, $0, 0x420
                sim.store(0x03, 0x421fffff); // sw $2, -1($1)
                sim.store(0x04, 0x40100000); // sw $0, 0($1)
                sim.store(0x05, 0x43100001); // sw $3, 1($1)
                sim.store(0x06, 0x70000000); // halt
                sim.store(0x07, 0x22222222);
                sim.store(0x08, 0x22222222);
                sim.store(0x09, 0x22222222);
            });

            it('run()', () => {
                return sim.run().then(() => {
                    expect(sim.isHalted()).toBe(true);
                    expect(sim.getPc()).toEqual(0x07);
                    expect(sim.getRegs()).toEqual({solo: {}, range: {'$': [
                        0x00000000, 0x00000008, 0xfffffffe & -1, 0x00000420,
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                    ]}});
                    expect(sim.load(0x07)).toEqual(0xfffffffe & -1);
                    expect(sim.load(0x08)).toEqual(0x00000000);
                    expect(sim.load(0x09)).toEqual(0x00000420);
                });
            });

            it('rewind()', () => {
                return sim.run().then(() => {
                    sim.rewind();
                    expect(sim.isHalted()).toBe(false);
                    expect(sim.getPc()).toEqual(0x00);
                    expect(sim.getRegs()).toEqual({solo: {}, range: {'$': [
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                    ]}});
                });
            });
        });

        describe('executes writes to $0 as noops', () => {
            beforeEach(() => {
                sim.store(0x00, 0x20000001); // addi $0, $0, 1
                sim.store(0x01, 0x70000000); // halt
            });

            it('run()', () => {
                return sim.run().then(() => {
                    expect(sim.isHalted()).toBe(true);
                    expect(sim.getPc()).toEqual(0x02);
                    expect(sim.getRegs()).toEqual({solo: {}, range: {'$': [
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                    ]}});
                });
            });

            it('rewind()', () => {
                return sim.run().then(() => {
                    sim.rewind();
                    expect(sim.isHalted()).toBe(false);
                    expect(sim.getPc()).toEqual(0x00);
                    expect(sim.getRegs()).toEqual({solo: {}, range: {'$': [
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                    ]}});
                });
            });
        });

        describe('errors on invalid instruction', () => {
            beforeEach(() => {
                sim.store(0x00, 0x80000000);
            });

            it('run()', () => {
                return expect(sim.run()).rejects.toThrow(/0x80000000/i);
            });
        });
    });

    describe('rama-2200 programs', () => {
        beforeEach(() => {
            sim = new Simulator(getIsa('rama2200'), io);
        });

        describe('halt', () => {
            beforeEach(() => {
                sim.store(0x00, 0x70000000); // halt
            });

            it('run()', () => {
                return sim.run().then(() => {
                    expect(sim.isHalted()).toBe(true);
                    expect(sim.getPc()).toEqual(0x01);
                });
            });

            it('rewind()', () => {
                return sim.run().then(() => {
                    sim.rewind();
                    expect(sim.isHalted()).toBe(false);
                    expect(sim.getPc()).toEqual(0x00);
                    expect(sim.getRegs()).toEqual({solo: {}, range: {'$': [
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                    ]}});
                });
            });
        });

        describe('adding two numbers', () => {
            beforeEach(() => {
                sim.store(0x00, 0x2100000f); // addi $1, $0, 15
                sim.store(0x01, 0x22000003); // addi $2, $0, 3
                sim.store(0x02, 0x03100002); // add $3, $1, $2
                sim.store(0x03, 0x05300002); // add $5, $3, $2
                sim.store(0x04, 0x70000000); // halt
            });

            it('run()', () => {
                return sim.run().then(() => {
                    expect(sim.isHalted()).toBe(true);
                    expect(sim.getPc()).toEqual(0x05);
                    expect(sim.getRegs()).toEqual({solo: {}, range: {'$': [
                        0x00000000, 0x0000000f, 0x00000003, 0x00000012,
                        0x00000000, 0x00000015, 0x00000000, 0x00000000,
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                    ]}});
                });
            });

            it('rewind()', () => {
                return sim.run().then(() => {
                    sim.rewind();
                    expect(sim.isHalted()).toBe(false);
                    expect(sim.getPc()).toEqual(0x00);
                    expect(sim.getRegs()).toEqual({solo: {}, range: {'$': [
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                    ]}});
                });
            });
        });

        describe('arithmetic', () => {
            beforeEach(() => {
                sim.store(0x00, 0x2a000045); // add $10, $0, 69
                sim.store(0x01, 0x17a0000a); // nand $7, $10, $10
                sim.store(0x02, 0x25700003); // addi $5, $7, 3
                sim.store(0x03, 0x00000000); // nop
                sim.store(0x04, 0x227ffffe); // addi $2, $7, -2
                sim.store(0x05, 0x0f200005); // add $15, $2, $5
                sim.store(0x06, 0x70000000); // halt
            });

            it('run()', () => {
                return sim.run().then(() => {
                    expect(sim.isHalted()).toBe(true);
                    expect(sim.getPc()).toEqual(0x07);
                    expect(sim.getRegs()).toEqual({solo: {}, range: {'$': [
                        0x00000000, 0x00000000, 0xffffffb8 & -1, 0x00000000,
                        0x00000000, 0xffffffbd & -1, 0x00000000, 0xffffffba & -1,
                        0x00000000, 0x00000000, 0x00000045, 0x00000000,
                        0x00000000, 0x00000000, 0x00000000, 0xffffff75 & -1,
                    ]}});
                });
            });

            it('rewind()', () => {
                return sim.run().then(() => {
                    sim.rewind();
                    expect(sim.isHalted()).toBe(false);
                    expect(sim.getPc()).toEqual(0x00);
                    expect(sim.getRegs()).toEqual({solo: {}, range: {'$': [
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                    ]}});
                });
            });
        });

        describe('conditional branching', () => {
            beforeEach(() => {
                sim.store(0x00, 0x2d0fffff); // addi $12, $0, -1
                sim.store(0x01, 0x2d000001); // addi $13, $0, 1
                sim.store(0x02, 0x2e000002); // addi $14, $0, 2
                sim.store(0x03, 0x2f000002); // addi $15, $0, 2
                // beq
                sim.store(0x04, 0x5ee00001); // beq $14, $14, 1 ! TAKEN
                sim.store(0x05, 0x21000001); // addi $1, $0, 1
                sim.store(0x06, 0x5ef00001); // beq $14, $15, 1 ! TAKEN
                sim.store(0x07, 0x22000001); // addi $2, $0, 1
                sim.store(0x08, 0x5de00001); // beq $14, $13, 1 ! NOT TAKEN
                sim.store(0x09, 0x23000001); // addi $3, $0, 1
                // blt
                sim.store(0x0a, 0x8ee00001); // blt $14, $14, 1 ! NOT TAKEN
                sim.store(0x0b, 0x24000001); // addi $4, $0, 1
                sim.store(0x0c, 0x8ef00001); // blt $14, $15, 1 ! NOT TAKEN
                sim.store(0x0d, 0x25000001); // addi $5, $0, 1
                sim.store(0x0e, 0x8ed00001); // blt $14, $13, 1 ! NOT TAKEN
                sim.store(0x0f, 0x26000001); // addi $6, $0, 1
                sim.store(0x10, 0x8de00001); // blt $13, $14, 1 ! TAKEN
                sim.store(0x11, 0x27000001); // addi $7, $0, 1
                sim.store(0x12, 0x8cd00001); // blt $12, $13, 1 ! TAKEN
                sim.store(0x13, 0x28000001); // addi $8, $0, 1
                sim.store(0x14, 0x8dc00001); // blt $13, $12, 1 ! NOT TAKEN
                sim.store(0x15, 0x29000001); // addi $9, $0, 1
                sim.store(0x16, 0x70000000); // halt
            });

            it('run()', () => {
                return sim.run().then(() => {
                    expect(sim.isHalted()).toBe(true);
                    expect(sim.getPc()).toEqual(0x17);
                    expect(sim.getRegs()).toEqual({solo: {}, range: {'$': [
                        0x00000000, 0x00000000, 0x00000000, 0x00000001,
                        0x00000001, 0x00000001, 0x00000001, 0x00000000,
                        0x00000000, 0x00000001, 0x00000000, 0x00000000,
                        0x00000000, 0x00000001, 0x00000002, 0x00000002,
                    ]}});
                });
            });

            it('rewind()', () => {
                return sim.run().then(() => {
                    sim.rewind();
                    expect(sim.isHalted()).toBe(false);
                    expect(sim.getPc()).toEqual(0x00);
                    expect(sim.getRegs()).toEqual({solo: {}, range: {'$': [
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                    ]}});
                });
            });
        });

        describe('executes unconditional branch instructions', () => {
            beforeEach(() => {
                sim.store(0x00, 0x50000001); // beq $0, $0, 1
                sim.store(0x01, 0x21000001); // addi $1, $0, 1
                sim.store(0x02, 0x2f000005); // addi $15, 0, 0x05
                sim.store(0x03, 0x6fe00000); // jalr $15, $14
                sim.store(0x04, 0x22000001); // addi $2, $0, 1
                sim.store(0x05, 0x70000000); // halt
            });

            it('run()', () => {
                return sim.run().then(() => {
                    expect(sim.isHalted()).toBe(true);
                    expect(sim.getPc()).toEqual(0x06);
                    expect(sim.getRegs()).toEqual({solo: {}, range: {'$': [
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                        0x00000000, 0x00000000, 0x00000004, 0x00000005,
                    ]}});
                });
            });

            it('rewind()', () => {
                return sim.run().then(() => {
                    sim.rewind();
                    expect(sim.isHalted()).toBe(false);
                    expect(sim.getPc()).toEqual(0x00);
                    expect(sim.getRegs()).toEqual({solo: {}, range: {'$': [
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                    ]}});
                });
            });
        });

        describe('jalr $x, $x', () => {
            beforeEach(() => {
                sim.store(0x00, 0x2f000003); // addi $15, $0, 0x03
                sim.store(0x01, 0x6ff00000); // jalr $15, $15
                sim.store(0x02, 0x21000001); // addi $1, $0, 1
                sim.store(0x03, 0x70000000); // halt
            });

            it('run()', () => {
                return sim.run().then(() => {
                    expect(sim.isHalted()).toBe(true);
                    expect(sim.getPc()).toEqual(0x04);
                    expect(sim.getRegs()).toEqual({solo: {}, range: {'$': [
                        0x00000000, 0x00000001, 0x00000000, 0x00000000,
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                        0x00000000, 0x00000000, 0x00000000, 0x00000002,
                    ]}});
                });
            });

            it('rewind()', () => {
                return sim.run().then(() => {
                    sim.rewind();
                    expect(sim.isHalted()).toBe(false);
                    expect(sim.getPc()).toEqual(0x00);
                    expect(sim.getRegs()).toEqual({solo: {}, range: {'$': [
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                    ]}});
                });
            });
        });

        describe('loading', () => {
            beforeEach(() => {
                sim.store(0x00, 0x21000008); // addi $1, $0, 0x08
                sim.store(0x01, 0x341fffff); // lw $4, -1($1)
                sim.store(0x02, 0x35100000); // lw $5, 0($1)
                sim.store(0x03, 0x36100001); // lw $6, 1($1)
                sim.store(0x04, 0x97000002); // lea $7, 2
                sim.store(0x05, 0x980fffff); // lea $8, -1
                sim.store(0x06, 0x70000000); // halt
                sim.store(0x07, 0x00000069); // .word 0x69
                sim.store(0x08, 0x00000420); // .word 0x420
                sim.store(0x09, 0xfffffffe); // .word -2
            });

            it('run()', () => {
                return sim.run().then(() => {
                    expect(sim.isHalted()).toBe(true);
                    expect(sim.getPc()).toEqual(0x07);
                    expect(sim.getRegs()).toEqual({solo: {}, range: {'$': [
                        0x00000000, 0x00000008, 0x00000000, 0x00000000,
                        0x00000069, 0x00000420, 0xfffffffe & -1, 0x00000007,
                        0x00000005, 0x00000000, 0x00000000, 0x00000000,
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                    ]}});
                });
            });

            it('rewind()', () => {
                return sim.run().then(() => {
                    sim.rewind();
                    expect(sim.isHalted()).toBe(false);
                    expect(sim.getPc()).toEqual(0x00);
                    expect(sim.getRegs()).toEqual({solo: {}, range: {'$': [
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                    ]}});
                });
            });
        });

        describe('executes stores', () => {
            beforeEach(() => {
                sim.store(0x00, 0x21000008); // addi $1, $0, 0x08
                sim.store(0x01, 0x220ffffe); // addi $2, $0, -2
                sim.store(0x02, 0x23000420); // addi $3, $0, 0x420
                sim.store(0x03, 0x421fffff); // sw $2, -1($1)
                sim.store(0x04, 0x40100000); // sw $0, 0($1)
                sim.store(0x05, 0x43100001); // sw $3, 1($1)
                sim.store(0x06, 0x70000000); // halt
                sim.store(0x07, 0x22222222);
                sim.store(0x08, 0x22222222);
                sim.store(0x09, 0x22222222);
            });

            it('run()', () => {
                return sim.run().then(() => {
                    expect(sim.isHalted()).toBe(true);
                    expect(sim.getPc()).toEqual(0x07);
                    expect(sim.getRegs()).toEqual({solo: {}, range: {'$': [
                        0x00000000, 0x00000008, 0xfffffffe & -1, 0x00000420,
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                    ]}});
                    expect(sim.load(0x07)).toEqual(0xfffffffe & -1);
                    expect(sim.load(0x08)).toEqual(0x00000000);
                    expect(sim.load(0x09)).toEqual(0x00000420);
                });
            });

            it('rewind()', () => {
                return sim.run().then(() => {
                    sim.rewind();
                    expect(sim.isHalted()).toBe(false);
                    expect(sim.getPc()).toEqual(0x00);
                    expect(sim.getRegs()).toEqual({solo: {}, range: {'$': [
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                    ]}});
                });
            });
        });

        describe('executes writes to $0 as noops', () => {
            beforeEach(() => {
                sim.store(0x00, 0x20000001); // addi $0, $0, 1
                sim.store(0x01, 0x70000000); // halt
            });

            it('run()', () => {
                return sim.run().then(() => {
                    expect(sim.isHalted()).toBe(true);
                    expect(sim.getPc()).toEqual(0x02);
                    expect(sim.getRegs()).toEqual({solo: {}, range: {'$': [
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                    ]}});
                });
            });

            it('rewind()', () => {
                return sim.run().then(() => {
                    sim.rewind();
                    expect(sim.isHalted()).toBe(false);
                    expect(sim.getPc()).toEqual(0x00);
                    expect(sim.getRegs()).toEqual({solo: {}, range: {'$': [
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                        0x00000000, 0x00000000, 0x00000000, 0x00000000,
                    ]}});
                });
            });
        });

        describe('errors on invalid instruction', () => {
            beforeEach(() => {
                sim.store(0x00, 0xa0000000);
            });

            it('run()', () => {
                return expect(sim.run()).rejects.toThrow(/0xa0000000/i);
            });
        });
    });
});
