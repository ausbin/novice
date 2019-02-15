import { IO } from './io';
import { AliasContext, AliasFields, Fields, Isa } from './isa';
import { MachineState, MachineStateUpdate, RegIdentifier } from './state';

function regEquals(rx: RegIdentifier, ry: RegIdentifier): boolean {
    return typeof rx !== 'string' && typeof ry !== 'string'
           && rx[0] === ry[0] && rx[1] === ry[1]
           || typeof rx === 'string' && typeof ry === 'string' && rx === ry;
}

function nukeR0Writes(updates: MachineStateUpdate[]): MachineStateUpdate[] {
    for (let i = 0; i < updates.length; i++) {
        const update = updates[i];
        // Don't allow changing $zero
        if (update.kind === 'reg' && regEquals(update.reg, ['$', 0])) {
            updates.splice(i, 1);
            i--;
        }
    }

    return updates;
}

const Lc2200Isa: Isa = {
    pc: {
        increment: 1,
        resetVector: 0x00000000,
        instrBits: 32,
    },
    mem: {
        word: 32,
        space: 32,
        addressability: 32,
    },
    regs: [
        {kind: 'reg-range', count: 16, prefix: '$', sext: true, bits: 32,
         aliases: {zero: 0,  at: 1,  v0: 2,  a0: 3,
                     a1: 4,  a2: 5,  t0: 6,  t1: 7,
                     t2: 8,  s0: 9,  s1: 10, s2: 11,
                     k0: 12, sp: 13, fp: 14, ra: 15}},
    ],
    instructions: [
        {op: 'add', fields: [
            {kind: 'const', bits: [31, 28], val: 0b0000},
            {kind: 'reg',   bits: [27, 24], prefix: '$', name: 'rx'},
            {kind: 'reg',   bits: [23, 20], prefix: '$', name: 'ry'},
            {kind: 'const', bits: [19,  4], val: 0x0000},
            {kind: 'reg',   bits: [ 3,  0], prefix: '$', name: 'rz'},
         ],
         sim: (state: MachineState, io: IO, ir: Fields) => nukeR0Writes(
             [{kind: 'reg', reg: ir.regs.rx, val: state.reg(ir.regs.ry) +
                                                  state.reg(ir.regs.rz)}]),
        },

        {op: 'nand', fields: [
            {kind: 'const', bits: [31, 28], val: 0b0001},
            {kind: 'reg',   bits: [27, 24], prefix: '$', name: 'rx'},
            {kind: 'reg',   bits: [23, 20], prefix: '$', name: 'ry'},
            {kind: 'const', bits: [19,  4], val: 0x0000},
            {kind: 'reg',   bits: [ 3,  0], prefix: '$', name: 'rz'},
         ],
         sim: (state: MachineState, io: IO, ir: Fields) => nukeR0Writes(
             [{kind: 'reg', reg: ir.regs.rx, val: ~(state.reg(ir.regs.ry) &
                                                    state.reg(ir.regs.rz))}]),
        },

        {op: 'addi', fields: [
            {kind: 'const', bits: [31, 28], val: 0b0010},
            {kind: 'reg',   bits: [27, 24], prefix: '$', name: 'rx'},
            {kind: 'reg',   bits: [23, 20], prefix: '$', name: 'ry'},
            {kind: 'imm',   bits: [19,  0], sext: true, label: false,
                                                         name: 'imm20'},
         ],
         sim: (state: MachineState, io: IO, ir: Fields) => nukeR0Writes(
             [{kind: 'reg', reg: ir.regs.rx, val: state.reg(ir.regs.ry) +
                                                  ir.imms.imm20}]),
        },

        {op: 'lw', fields: [
            {kind: 'const', bits: [31, 28], val: 0b0011},
            {kind: 'reg',   bits: [27, 24], prefix: '$', name: 'rx'},
            {kind: 'imm',   bits: [19,  0], sext: true, label: false,
                                                         name: 'imm20'},
            {kind: 'reg',   bits: [23, 20], prefix: '$', name: 'ry'},
         ],
         sim: (state: MachineState, io: IO, ir: Fields) => nukeR0Writes(
             [{kind: 'reg', reg: ir.regs.rx,
               val: state.load(state.reg(ir.regs.ry) + ir.imms.imm20)}]),
        },

        {op: 'sw', fields: [
            {kind: 'const', bits: [31, 28], val: 0b0100},
            {kind: 'reg',   bits: [27, 24], prefix: '$', name: 'rx'},
            {kind: 'imm',   bits: [19,  0], sext: true, label: false,
                                                         name: 'imm20'},
            {kind: 'reg',   bits: [23, 20], prefix: '$', name: 'ry'},
         ],
         sim: (state: MachineState, io: IO, ir: Fields) =>
             [{kind: 'mem', addr: state.reg(ir.regs.ry) + ir.imms.imm20,
               val: state.reg(ir.regs.rx)}],
        },

        {op: 'beq', fields: [
            {kind: 'const', bits: [31, 28], val: 0b0101},
            {kind: 'reg',   bits: [27, 24], prefix: '$', name: 'rx'},
            {kind: 'reg',   bits: [23, 20], prefix: '$', name: 'ry'},
            {kind: 'imm',   bits: [19,  0], sext: true, label: true,
                                                         name: 'imm20'},
         ],
         sim: (state: MachineState, io: IO, ir: Fields) =>
             (state.reg(ir.regs.rx) === state.reg(ir.regs.ry))
                 ? [{kind: 'pc', where: state.pc + 1 + ir.imms.imm20}]
                 : [],
        },

        {op: 'jalr', fields: [
            {kind: 'const', bits: [31, 28], val: 0b0110},
            {kind: 'reg',   bits: [27, 24], prefix: '$', name: 'rx'},
            {kind: 'reg',   bits: [23, 20], prefix: '$', name: 'ry'},
            {kind: 'const', bits: [19,  0], val: 0x00000},
         ],
         sim: (state: MachineState, io: IO, ir: Fields) => nukeR0Writes(
             [{kind: 'reg', reg: ir.regs.ry, val: state.pc + 1},
              {kind: 'pc',
               where: (!regEquals(ir.regs.ry, ['$', 0])
                       && regEquals(ir.regs.rx, ir.regs.ry))
                       ? state.pc + 1
                       : state.reg(ir.regs.rx)}]),
        },

        {op: 'nop', fields: [
            {kind: 'const', bits: [31, 0], val: 0x00000000},
         ],
         sim: (state: MachineState, io: IO, ir: Fields) => [],
        },

        {op: 'halt', fields: [
            {kind: 'const', bits: [31, 28], val: 0b0111},
            {kind: 'const', bits: [27,  0], val: 0x0000000},
         ],
         sim: (state: MachineState, io: IO, ir: Fields) =>
             [{kind: 'halt', halted: true}],
        },
    ],

    aliases: [
        {op: 'la', operands: [
            {kind: 'reg',  name: 'rx'},
            {kind: 'label', name: 'label'},
         ],
         size: 2,
         asm: (ctx: AliasContext, fields: AliasFields) => {
            if (!ctx.symbtable.hasOwnProperty(fields.labels.label)) {
                throw new Error(`unknown label ${fields.labels.label} to ` +
                                `la on line ${ctx.line}`);
            }

            return [
                {kind: 'instr', line: ctx.line, op: 'jalr', operands: [
                    {kind: 'reg', prefix: '$', num: fields.regs.rx[1]},
                    {kind: 'reg', prefix: '$', num: fields.regs.rx[1]},
                ]},
                {kind: 'instr', line: ctx.line, op: 'addi', operands: [
                    {kind: 'reg', prefix: '$', num: fields.regs.rx[1]},
                    {kind: 'reg', prefix: '$', num: 0},
                    // TODO: complain if does not exist
                    {kind: 'int', val: ctx.symbtable[fields.labels.label] - ctx.pc - 1},
                ]},
            ];
         }},
    ],
};

export { Lc2200Isa };
