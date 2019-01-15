import { Fields, Isa } from './isa';
import { MachineState, MachineStateUpdate } from './state';

function calcCc(val: number): number {
    const fixed = val & 0xffff;
    return (fixed === 0) ? 0b010 :
           // MSB is set
           (fixed & 1 << 15) ? 0b100 :
           0b001;
}

function withCcUpdate(updates: MachineStateUpdate[]): MachineStateUpdate[] {
    for (const update of updates) {
        if (update.kind === 'reg') {
            updates.push({kind: 'reg', reg: 'cc', val: calcCc(update.val)});
            break;
        }
    }
    return updates;
}

const Lc3Isa: Isa = {
    pc: {
        increment: 1,
        resetVector: 0x3000,
        instrBits: 16,
    },
    mem: {
        word: 16,
        space: 16,
        addressability: 16,
    },
    regs: [
        {kind: 'reg', name: 'cc', bits: 3},
        {kind: 'reg-range', count: 8, prefix: 'r', bits: 16},
    ],
    instructions: [
        {op: 'add', fields: [
            {kind: 'const', bits: [15, 12], val: 0b0001},
            {kind: 'reg',   bits: [11,  9], prefix: 'r', name: 'dr'},
            {kind: 'reg',   bits: [ 8,  6], prefix: 'r', name: 'sr1'},
            {kind: 'const', bits: [ 5,  3], val: 0b000},
            {kind: 'reg',   bits: [ 2,  0], prefix: 'r', name: 'sr2'},
         ],
         sim: (state: MachineState, ir: Fields) => withCcUpdate(
             [{kind: 'reg', reg: ir.regs.dr, val: state.reg(ir.regs.sr1) +
                                                  state.reg(ir.regs.sr2)}]),
        },

        {op: 'add', fields: [
            {kind: 'const', bits: [15, 12], val: 0b0001},
            {kind: 'reg',   bits: [11,  9], prefix: 'r', name: 'dr'},
            {kind: 'reg',   bits: [ 8,  6], prefix: 'r', name: 'sr1'},
            {kind: 'const', bits: [ 5,  5], val: 0b1},
            {kind: 'imm',   bits: [ 4,  0], sext: true, label: false,
             name: 'imm5'},
         ],
         sim: (state: MachineState, ir: Fields) => withCcUpdate(
             [{kind: 'reg', reg: ir.regs.dr, val: state.reg(ir.regs.sr1) +
                                                  ir.imms.imm5}]),
        },

        {op: 'and', fields: [
            {kind: 'const', bits: [15, 12], val: 0b0101},
            {kind: 'reg',   bits: [11,  9], prefix: 'r', name: 'dr'},
            {kind: 'reg',   bits: [ 8,  6], prefix: 'r', name: 'sr1'},
            {kind: 'const', bits: [ 5,  3], val: 0b000},
            {kind: 'reg',   bits: [ 2,  0], prefix: 'r', name: 'sr2'},
         ],
         sim: (state: MachineState, ir: Fields) => withCcUpdate(
             [{kind: 'reg', reg: ir.regs.dr, val: state.reg(ir.regs.sr1) &
                                                  state.reg(ir.regs.sr2)}]),
        },

        {op: 'and', fields: [
            {kind: 'const', bits: [15, 12], val: 0b0101},
            {kind: 'reg',   bits: [11,  9], prefix: 'r', name: 'dr'},
            {kind: 'reg',   bits: [ 8,  6], prefix: 'r', name: 'sr1'},
            {kind: 'const', bits: [ 5,  5], val: 0b1},
            {kind: 'imm',   bits: [ 4,  0], sext: true, label: false,
             name: 'imm5'},
         ],
         sim: (state: MachineState, ir: Fields) => withCcUpdate(
             [{kind: 'reg', reg: ir.regs.dr, val: state.reg(ir.regs.sr1) &
                                                  ir.imms.imm5}]),
        },

        {op: 'nop', fields: [
            {kind: 'const', bits: [15,  0], val: 0x0000},
         ],
         sim: (state: MachineState, ir: Fields) => [],
        },

        {op: 'br', fields: [
            {kind: 'const', bits: [15,  9], val: 0b0000111},
            {kind: 'imm',   bits: [ 8,  0], sext: true, label: true,
             name: 'pcoffset9'},
         ],
         sim: (state: MachineState, ir: Fields) =>
             [{kind: 'pc', where: state.pc + 1 + ir.imms.pcoffset9}],
        },

        {op: 'brnzp', fields: [
            {kind: 'const', bits: [15,  9], val: 0b0000111},
            {kind: 'imm',   bits: [ 8,  0], sext: true, label: true,
             name: 'pcoffset9'},
         ],
         sim: (state: MachineState, ir: Fields) =>
             [{kind: 'pc', where: state.pc + 1 + ir.imms.pcoffset9}],
        },

        {op: 'brp', fields: [
            {kind: 'const', bits: [15,  9], val: 0b0000001},
            {kind: 'imm',   bits: [ 8,  0], sext: true, label: true,
             name: 'pcoffset9'},
         ],
         sim: (state: MachineState, ir: Fields) =>
             (state.reg('cc') & 0b001)
             ? [{kind: 'pc', where: state.pc + 1 + ir.imms.pcoffset9}]
             : [],
        },

        {op: 'brz', fields: [
            {kind: 'const', bits: [15,  9], val: 0b0000010},
            {kind: 'imm',   bits: [ 8,  0], sext: true, label: true,
             name: 'pcoffset9'},
         ],
         sim: (state: MachineState, ir: Fields) =>
             (state.reg('cc') & 0b010)
             ? [{kind: 'pc', where: state.pc + 1 + ir.imms.pcoffset9}]
             : [],
        },

        {op: 'brzp', fields: [
            {kind: 'const', bits: [15,  9], val: 0b0000011},
            {kind: 'imm',   bits: [ 8,  0], sext: true, label: true,
             name: 'pcoffset9'},
         ],
         sim: (state: MachineState, ir: Fields) =>
             (state.reg('cc') & 0b011)
             ? [{kind: 'pc', where: state.pc + 1 + ir.imms.pcoffset9}]
             : [],
        },

        {op: 'brn', fields: [
            {kind: 'const', bits: [15,  9], val: 0b0000100},
            {kind: 'imm',   bits: [ 8,  0], sext: true, label: true,
             name: 'pcoffset9'},
         ],
         sim: (state: MachineState, ir: Fields) =>
             (state.reg('cc') & 0b100)
             ? [{kind: 'pc', where: state.pc + 1 + ir.imms.pcoffset9}]
             : [],
        },

        {op: 'brnp', fields: [
            {kind: 'const', bits: [15,  9], val: 0b0000101},
            {kind: 'imm',   bits: [ 8,  0], sext: true, label: true,
             name: 'pcoffset9'},
         ],
         sim: (state: MachineState, ir: Fields) =>
             (state.reg('cc') & 0b101)
             ? [{kind: 'pc', where: state.pc + 1 + ir.imms.pcoffset9}]
             : [],
        },

        {op: 'brnz', fields: [
            {kind: 'const', bits: [15,  9], val: 0b0000110},
            {kind: 'imm',   bits: [ 8,  0], sext: true, label: true,
             name: 'pcoffset9'},
         ],
         sim: (state: MachineState, ir: Fields) =>
             (state.reg('cc') & 0b110)
             ? [{kind: 'pc', where: state.pc + 1 + ir.imms.pcoffset9}]
             : [],
        },

        {op: 'jmp', fields: [
            {kind: 'const', bits: [15,  9], val: 0b1100000},
            {kind: 'reg',   bits: [ 8,  6], prefix: 'r', name: 'baser'},
            {kind: 'const', bits: [ 5,  0], val: 0b000000},
         ],
         sim: (state: MachineState, ir: Fields) =>
             [{kind: 'pc', where: state.reg(ir.regs.baser)}],
        },

        {op: 'ret', fields: [
            {kind: 'const', bits: [15,  0], val: 0b1100000111000000},
         ],
         sim: (state: MachineState, ir: Fields) =>
             [{kind: 'pc', where: state.reg(['r', 7])}],
        },

        {op: 'jsr', fields: [
            {kind: 'const', bits: [15, 11], val: 0b01001},
            {kind: 'imm',   bits: [10,  0], sext: true, label: true,
             name: 'pcoffset11'},
         ],
         sim: (state: MachineState, ir: Fields) => withCcUpdate(
             [{kind: 'pc', where: state.pc + 1 + ir.imms.pcoffset11},
              {kind: 'reg', reg: ['r', 7], val: state.pc + 1}]),
        },

        {op: 'jsrr', fields: [
            {kind: 'const', bits: [15,  9], val: 0b0100000},
            {kind: 'reg',   bits: [ 8,  6], prefix: 'r', name: 'baser'},
            {kind: 'const', bits: [ 5,  0], val: 0b000000},
         ],
         sim: (state: MachineState, ir: Fields) => withCcUpdate(
             [{kind: 'pc', where: state.reg(ir.regs.baser)},
              {kind: 'reg', reg: ['r', 7], val: state.pc + 1}]),
        },

        {op: 'ld', fields: [
            {kind: 'const', bits: [15, 12], val: 0b0010},
            {kind: 'reg',   bits: [11,  9], prefix: 'r', name: 'dr'},
            {kind: 'imm',   bits: [ 8,  0], sext: true, label: true,
             name: 'pcoffset9'},
         ],
         sim: (state: MachineState, ir: Fields) => withCcUpdate(
             [{kind: 'reg', reg: ir.regs.dr,
               val: state.load(state.pc + 1 + ir.imms.pcoffset9)}]),
        },

        {op: 'ldi', fields: [
            {kind: 'const', bits: [15, 12], val: 0b1010},
            {kind: 'reg',   bits: [11,  9], prefix: 'r', name: 'dr'},
            {kind: 'imm',   bits: [ 8,  0], sext: true, label: true,
             name: 'pcoffset9'},
         ],
         sim: (state: MachineState, ir: Fields) => withCcUpdate(
             [{kind: 'reg', reg: ir.regs.dr,
               val: state.load(state.pc + 1 + ir.imms.pcoffset9)}]),
        },

        {op: 'ldr', fields: [
            {kind: 'const', bits: [15, 12], val: 0b0110},
            {kind: 'reg',   bits: [11,  9], prefix: 'r', name: 'dr'},
            {kind: 'reg',   bits: [ 8,  6], prefix: 'r', name: 'baser'},
            {kind: 'imm',   bits: [ 5,  0], sext: true, label: false,
             name: 'offset6'},
         ],
         sim: (state: MachineState, ir: Fields) => withCcUpdate(
             [{kind: 'reg', reg: ir.regs.dr,
               val: state.load(state.reg(ir.regs.baser) + 1 +
                               ir.imms.offset6)}]),
        },

        {op: 'lea', fields: [
            {kind: 'const', bits: [15, 12], val: 0b1110},
            {kind: 'reg',   bits: [11,  9], prefix: 'r', name: 'dr'},
            {kind: 'imm',   bits: [ 8,  0], sext: true, label: true,
             name: 'pcoffset9'},
         ],
         sim: (state: MachineState, ir: Fields) => withCcUpdate(
             [{kind: 'reg', reg: ir.regs.dr,
               val: state.pc + 1 + ir.imms.pcoffset9}]),
        },

        {op: 'not', fields: [
            {kind: 'const', bits: [15, 12], val: 0b1001},
            {kind: 'reg',   bits: [11,  9], prefix: 'r', name: 'dr'},
            {kind: 'reg',   bits: [ 8,  6], prefix: 'r', name: 'sr'},
            {kind: 'const', bits: [ 5,  0], val: 0b111111},
         ],
         sim: (state: MachineState, ir: Fields) => withCcUpdate(
             [{kind: 'reg', reg: ir.regs.dr, val: ~state.reg(ir.regs.sr)}]),
        },

        {op: 'st', fields: [
            {kind: 'const', bits: [15, 12], val: 0b0011},
            {kind: 'reg',   bits: [11,  9], prefix: 'r', name: 'sr'},
            {kind: 'imm',   bits: [ 8,  0], sext: true, label: true,
             name: 'pcoffset9'},
         ],
         sim: (state: MachineState, ir: Fields) =>
             [{kind: 'mem', addr: state.pc + 1 + ir.imms.pcoffset9,
               val: state.reg(ir.regs.sr)}],
        },

        {op: 'sti', fields: [
            {kind: 'const', bits: [15, 12], val: 0b1011},
            {kind: 'reg',   bits: [11,  9], prefix: 'r', name: 'sr'},
            {kind: 'imm',   bits: [ 8,  0], sext: true, label: true,
             name: 'pcoffset9'},
         ],
         sim: (state: MachineState, ir: Fields) =>
             [{kind: 'mem',
               addr: state.load(state.pc + 1 + ir.imms.pcoffset9),
               val: state.reg(ir.regs.sr)}],
        },

        {op: 'str', fields: [
            {kind: 'const', bits: [15, 12], val: 0b0111},
            {kind: 'reg',   bits: [11,  9], prefix: 'r', name: 'sr'},
            {kind: 'reg',   bits: [ 8,  6], prefix: 'r', name: 'baser'},
            {kind: 'imm',   bits: [ 5,  0], sext: true, label: false,
             name: 'offset6'},
         ],
         sim: (state: MachineState, ir: Fields) =>
             [{kind: 'mem',
               addr: state.reg(ir.regs.baser) + ir.imms.offset6,
               val: state.reg(ir.regs.sr)}],
        },

        {op: 'trap', fields: [
            {kind: 'const', bits: [15,  8], val: 0b11110000},
            {kind: 'imm',   bits: [ 7,  0], sext: false, label: false,
             name: 'trapvect8'},
         ],
         sim: (state: MachineState, ir: Fields) =>
             [{kind: 'reg', reg: ['r', 7], val: state.pc + 1},
              {kind: 'pc', where: state.load(ir.imms.trapvect8)}],
        },

        // TODO: implement these
        {op: 'getc', fields: [
            {kind: 'const', bits: [15,  0], val: 0b1111000000100000},
         ],
         sim: (state: MachineState, ir: Fields) => [],
        },

        {op: 'out', fields: [
            {kind: 'const', bits: [15,  0], val: 0b1111000000100001},
         ],
         sim: (state: MachineState, ir: Fields) => [],
        },

        {op: 'puts', fields: [
            {kind: 'const', bits: [15,  0], val: 0b1111000000100010},
         ],
         sim: (state: MachineState, ir: Fields) => [],
        },

        {op: 'in', fields: [
            {kind: 'const', bits: [15,  0], val: 0b1111000000100011},
         ],
         sim: (state: MachineState, ir: Fields) => [],
        },

        {op: 'halt', fields: [
            {kind: 'const', bits: [15,  0], val: 0b1111000000100101},
         ],
         sim: (state: MachineState, ir: Fields) => [],
        },
    ],
};

export { Lc3Isa };