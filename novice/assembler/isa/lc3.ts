import { Fields, Isa } from './isa';
import { MachineState, MachineStateUpdate } from './state';

function calcCC(val: number): number {
    const fixed = val & 0xffff | -1 << 16;
    return (fixed < 0) ? 0b100 : (fixed > 0) ? 0b001 : 0b010;
}

const Lc3Isa: Isa = {
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
         sim: (state: MachineState, ir: Fields) => {
             const sum = state.reg(ir.regs.sr1) + state.reg(ir.regs.sr2);
             return [
                {kind: 'reg', reg: ir.regs.dr, val: sum},
                {kind: 'reg', reg: 'cc', val: calcCC(sum)},
             ];
        }},

        {op: 'add', fields: [
            {kind: 'const', bits: [15, 12], val: 0b0001},
            {kind: 'reg',   bits: [11,  9], prefix: 'r', name: 'dr'},
            {kind: 'reg',   bits: [ 8,  6], prefix: 'r', name: 'sr1'},
            {kind: 'const', bits: [ 5,  5], val: 0b1},
            {kind: 'imm',   bits: [ 4,  0], sext: true, label: false,
             name: 'imm5'},
         ],
         sim: (state: MachineState, ir: Fields) => {
             const sum = state.reg(ir.regs.sr1) + ir.imms.imm5;
             return [
                {kind: 'reg', reg: ir.regs.dr, val: sum},
                {kind: 'reg', reg: 'cc', val: calcCC(sum)},
             ];
        }},
    ],
};

export { Lc3Isa };
