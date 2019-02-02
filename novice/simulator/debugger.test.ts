import { Debugger } from './debugger';
import { getIsa } from '../isa';
import { FakeIO } from './helpers.test';

// for programs with ONE section, generate store() calls with
// storify() { ./novice.js asm "$1"; xxd -p "${1%.asm}.obj" | tr -d '\n' | awk '{ print substr($1,9) }' | sed 's/\(.\{4\}\)/\1\n/g' | head -n -1 | awk '{ printf "dbg.store(0x%04x, 0x%s);\n", 0x3000 + NR - 1, $1 }'; }; storify meme.asm

describe('debugger', () => {
    let io: FakeIO;
    let dbg: Debugger;

    beforeEach(() => {
        io = new FakeIO();
    });

    describe('lc-3 programs', () => {
        beforeEach(() => {
            dbg = new Debugger(getIsa('lc3'), io, 128);
        });

        describe('zeroed memory', () => {
            beforeEach(() => {
                // 1024 nops
                for (let i = 0; i < (1 << 10); i++) {
                    dbg.store(0x3000 + i, 0x0000); // nop
                }
            });

            it('runs 128 instructions for each continue', () => {
                return expect(dbg.cont()).rejects.toThrow('infinite loop').then(() => {
                    expect(dbg.getPc()).toEqual(0x3080);
                }).then(() => {
                    // This is a promise, so return it
                    return expect(dbg.cont()).rejects.toThrow('infinite loop');
                }).then(() => {
                    // The crucial check: did continue go for another 128
                    // instructions?
                    expect(dbg.getPc()).toEqual(0x3100);
                });
            });

            it('respects maxExec = -1', () => {
                // set maxExec = -1 instead
                dbg = new Debugger(getIsa('lc3'), io, -1);
                dbg.store(0x3100, 0xf025); // halt 256 deep, much past the OG
                                           // 128 max

                return dbg.cont().then(() => {
                    expect(dbg.isHalted()).toBe(true);
                    expect(dbg.getPc()).toEqual(0x3101);
                });
            });
        });

        describe('infinite loop', () => {
            beforeEach(() => {
                dbg.store(0x3000, 0b0000111111111111); // brnzp -1
            });

            it('stops after 128 executions', () => {
                return expect(dbg.cont()).rejects.toThrow('infinite loop');
            });
        });

        describe('prints 3 bangs', () => {
            beforeEach(() => {
                dbg.store(0x3000, 0x2007); // ld r0, bang
                dbg.store(0x3001, 0x54a0); // and r2, r2, 0
                dbg.store(0x3002, 0x14a3); // add r2, r2, 3
                dbg.store(0x3003, 0x0c03); // loop brnz done
                dbg.store(0x3004, 0xf021); // out
                dbg.store(0x3005, 0x14bf); // add r2, r2, -1
                dbg.store(0x3006, 0x0ffc); // br loop
                dbg.store(0x3007, 0xf025); // done halt
                dbg.store(0x3008, 0x0021); // bang .fill '!'
                dbg.store(0x3009, 0xd000); // .fill 0xd000
            });

            it('errors on negative breakpoint', () => {
                expect(() => {
                    dbg.addBreakpoint(-0xf);
                }).toThrow('negative');
            });

            it('errors on oversized breakpoint', () => {
                expect(() => {
                    dbg.addBreakpoint(0x10000);
                }).toThrow('large');
            });

            it('errors on dupe breakpoints', () => {
                dbg.addBreakpoint(0x3000);
                expect(() => {
                    dbg.addBreakpoint(0x3000);
                }).toThrow('0x3000');
            });

            it('obeys breakpoints', () => {
                dbg.addBreakpoint(0x3004);

                return dbg.cont().then(() => {
                    expect(dbg.getPc()).toEqual(0x3004);
                    expect(dbg.isHalted()).toBe(false);
                    expect(io.stdout).toEqual('');
                    return dbg.cont();
                }).then(() => {
                    expect(dbg.getPc()).toEqual(0x3004);
                    expect(dbg.isHalted()).toBe(false);
                    expect(io.stdout).toEqual('!');
                    return dbg.cont();
                }).then(() => {
                    expect(dbg.getPc()).toEqual(0x3004);
                    expect(dbg.isHalted()).toBe(false);
                    expect(io.stdout).toEqual('!!');
                    return dbg.cont();
                }).then(() => {
                    expect(dbg.getPc()).toEqual(0x3008);
                    expect(dbg.isHalted()).toBe(true);
                    expect(io.stdout).toEqual('!!!');
                });
            });

            it('disassembles an instruction with operands', () => {
                expect(dbg.disassembleAt(0x3005)).toEqual('add r2, r2, -1');
            });

            it('disassembles an instruction with no operands', () => {
                expect(dbg.disassembleAt(0x3007)).toEqual('halt');
            });

            it('returns null for non-disassemblable words', () => {
                expect(dbg.disassembleAt(0x3009)).toBe(null);
            });

            it('disassembles the whole dang thing', () => {
                expect(dbg.disassembleRegion(0x2ffe, 0x300b)).toEqual([
                    [0x2ffe, 0x0000,      0, "nop"],
                    [0x2fff, 0x0000,      0, "nop"],
                    [0x3000, 0x2007,   8199, "ld r0, 7"],
                    [0x3001, 0x54a0,  21664, "and r2, r2, 0"],
                    [0x3002, 0x14a3,   5283, "add r2, r2, 3"],
                    [0x3003, 0x0c03,   3075, "brnz 3"],
                    [0x3004, 0xf021,  -4063, "out"],
                    [0x3005, 0x14bf,   5311, "add r2, r2, -1"],
                    [0x3006, 0x0ffc,   4092, "brnzp -4"],
                    [0x3007, 0xf025,  -4059, "halt"],
                    [0x3008, 0x0021,     33, null],
                    [0x3009, 0xd000, -12288, null],
                    [0x300a, 0x0000,      0, "nop"],
                    [0x300b, 0x0000,      0, "nop"],
                ]);
            });

            it('disassembles reversed operands', () => {
                expect(dbg.disassembleRegion(0x3004, 0x3002)).toEqual([
                    [0x3002, 0x14a3,   5283, "add r2, r2, 3"],
                    [0x3003, 0x0c03,   3075, "brnz 3"],
                    [0x3004, 0xf021,  -4063, "out"],
                ]);
            });
        });
    });
});
