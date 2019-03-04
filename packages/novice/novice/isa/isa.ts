import { maskTo, sextTo } from '../util';
import { Instruction, PseudoOp } from './assembly';
import { IO } from './io';
import { FullMachineState, MachineState, MachineStateUpdate,
         RegIdentifier } from './state';

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

type SymbTable = {[s: string]: number};

interface AliasContext {
    pc: number;
    line: number;
    symbtable: SymbTable;
}

interface AliasSpec {
    op: string;
    size: number;
    operands: AliasOpSpec[];
    asm: (ctx: AliasContext, fields: AliasFields) => (Instruction|PseudoOp)[];
}

interface IsaSpec {
    pc: Pc;
    mem: Mem;
    regs: Reg[];
    instructions: InstructionSpec[];
    aliases: AliasSpec[];
}

class Isa {
    public spec: IsaSpec;

    public constructor(spec: IsaSpec) {
        this.spec = spec;
    }

    public regPrefixes(): string[] {
        const result = [];
        for (const reg of this.spec.regs) {
            if (reg.kind === 'reg-range') {
                result.push(reg.prefix);
            }
        }
        return result;
    }

    public getRegAliases(prefix: string): {[s: string]: number} {
        for (const reg of this.spec.regs) {
            if (reg.kind === 'reg-range' && reg.prefix === prefix) {
                return reg.aliases || {};
            }
        }

        throw new Error(`no such register prefix ${prefix}`);
    }

    public isInstruction(op: string): boolean {
        return this.spec.instructions.some(instr => instr.op === op) ||
               this.spec.aliases.some(alias => alias.op === op);
    }

    public initMachineState(): FullMachineState {
        const state: FullMachineState = {
            pc: this.spec.pc.resetVector,
            mem: {},
            regs: {
                solo: {},
                range: {},
            },
            halted: false,
        };

        for (const reg of this.spec.regs) {
            switch (reg.kind) {
                case 'reg':
                    state.regs.solo[reg.name] = 0;
                    break;

                case 'reg-range':
                    state.regs.range[reg.prefix] = new Array<number>(reg.count);
                    for (let i = 0; i < reg.count; i++) {
                        state.regs.range[reg.prefix][i] = 0;
                    }
                    break;

                default:
                    const _: never = reg;
            }
        }

        return state;
    }

    public stateApplyUpdates(state: FullMachineState,
                             updates: MachineStateUpdate[]):
            [FullMachineState, MachineStateUpdate[]] {
        if (updates.length === 0) {
            return [state, []];
        }

        const newState = Object.assign({}, state);
        const undos: MachineStateUpdate[] = [];

        for (const update of updates) {
            switch (update.kind) {
                case 'reg':
                    undos.push({kind: 'reg', reg: update.reg,
                                val: this.stateReg(newState, update.reg)});
                    if (newState.regs === state.regs) {
                        newState.regs = Object.assign({}, state.regs);
                    }
                    this.stateRegSet(newState, update.reg, update.val);
                    break;

                case 'mem':
                    undos.push({kind: 'mem', addr: update.addr,
                                val: this.stateLoad(newState, update.addr)});
                    if (newState.mem === state.mem) {
                        newState.mem = Object.assign({}, state.mem);
                    }
                    this.stateStore(newState, update.addr, update.val);
                    break;

                case 'pc':
                    undos.push({kind: 'pc', where: newState.pc});
                    newState.pc = update.where;
                    break;

                case 'halt':
                    undos.push({kind: 'halt', halted: newState.halted});
                    newState.halted = update.halted;
                    break;

                default:
                    const _: never = update;
            }
        }

        // Need to undo them in opposite order
        return [newState, undos.reverse()];
    }

    public stateLoad(state: FullMachineState, addr: number): number {
        if (state.mem.hasOwnProperty(addr)) {
            return state.mem[addr];
        } else {
            return 0;
        }
    }

    public stateStore(state: FullMachineState, addr: number, val: number): void {
        state.mem[addr] = maskTo(val, this.spec.mem.word);
    }

    public stateReg(state: FullMachineState, id: RegIdentifier): number {
        const reg = this.lookupRegSpec(id);
        let val;

        if (typeof id === 'string') {
            val = state.regs.solo[id];
        } else {
            val = state.regs.range[id[0]][id[1]];
        }

        if (reg.sext) {
            val = sextTo(val, reg.bits);
        }

        return val;
    }

    public stateRegSet(state: FullMachineState, id: RegIdentifier, val: number): void {
        const reg = this.lookupRegSpec(id);
        val = maskTo(val, reg.bits);

        if (typeof id === 'string') {
            state.regs.solo[id] = val;
        } else {
            state.regs.range[id[0]][id[1]] = val;
        }
    }

    public lookupRegSpec(id: RegIdentifier): Reg {
        for (const reg of this.spec.regs) {
            if (typeof id === 'string' && reg.kind === 'reg'
                    && reg.name === id ||
                typeof id !== 'string' && reg.kind === 'reg-range'
                    && id[0] === reg.prefix) {
                return reg;
            }
        }

        throw new Error(`unknown register identifier ${id}`);
    }
}

export { Isa, IsaSpec, Fields, InstructionSpec, Reg, AliasContext, AliasFields,
         AliasSpec, SymbTable };
