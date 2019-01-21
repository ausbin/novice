import { Instruction, PseudoOp } from './assembly';
import { IO } from './io';
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
    sext: boolean;
    bits: number;
}

interface RegRange {
    kind: 'reg-range';
    count: number;
    prefix: string;
    sext: boolean;
    bits: number;
    aliases?: {[s: string]: number};
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

interface InstructionSpec {
    op: string;
    fields: Field[];
    sim: (state: MachineState, io: IO, ir: Fields) =>
         (MachineStateUpdate[]|Promise<MachineStateUpdate[]>);
}

interface AliasOpSpec {
    kind: 'label'|'reg'|'int';
    name: string;
}

interface AliasFields  {
    regs: {[s: string]: [string, number]};
    ints: {[s: string]: number};
    labels: {[s: string]: string};
}

interface AliasContext {
    pc: number;
    line: number;
    symbtable: {[s: string]: number};
}

interface AliasSpec {
    op: string;
    size: number;
    operands: AliasOpSpec[];
    asm: (ctx: AliasContext, fields: AliasFields) => (Instruction|PseudoOp)[];
}

interface Isa {
    pc: Pc;
    mem: Mem;
    regs: Reg[];
    instructions: InstructionSpec[];
    aliases: AliasSpec[];
}

function regPrefixes(isa: Isa): string[] {
    const result = [];
    for (const reg of isa.regs) {
        if (reg.kind === 'reg-range') {
            result.push(reg.prefix);
        }
    }
    return result;
}

function getRegAliases(isa: Isa, prefix: string): {[s: string]: number} {
    for (const reg of isa.regs) {
        if (reg.kind === 'reg-range' && reg.prefix === prefix) {
            return reg.aliases || {};
        }
    }

    throw new Error(`no such register prefix ${prefix}`);
}

function isInstruction(isa: Isa, op: string): boolean {
    return isa.instructions.some(instr => instr.op === op) ||
           isa.aliases.some(alias => alias.op === op);
}

export { Isa, Fields, InstructionSpec, Reg, regPrefixes, getRegAliases,
         isInstruction, AliasContext, AliasFields, AliasSpec };
