import { MachineState, MachineStateUpdate, RegIdentifier } from './state';

interface Pc {
    // by how much is the pc incremented during FETCH?
    increment: number;
    resetVector: number;
    instrBits: number;
}

interface Mem {
    word: number;
    space: number;
    addressability: number;
}

interface RegSolo {
    kind: 'reg';
    name: string;
    bits: number;
}

interface RegRange {
    kind: 'reg-range';
    count: number;
    prefix: string;
    bits: number;
}

type Reg = RegSolo|RegRange;

interface ConstantField {
    kind: 'const';
    bits: [number, number];
    val: number;
}

interface RegisterField {
    kind: 'reg';
    bits: [number, number];
    prefix: string;
    name: string;
}

interface ImmediateField {
    kind: 'imm';
    bits: [number, number];
    sext: boolean;
    label: boolean;
    name: string;
}

type Field = ConstantField|RegisterField|ImmediateField;

interface Fields  {
    regs: {[s: string]: RegIdentifier};
    imms: {[s: string]: number};
}

interface Instruction {
    op: string;
    fields: Field[];
    sim: (state: MachineState, ir: Fields) => MachineStateUpdate[];
}

interface Isa {
    pc: Pc;
    mem: Mem;
    regs: Reg[];
    instructions: Instruction[];
}

export { Isa, Fields, Instruction };
