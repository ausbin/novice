import { forceUnsigned, maskTo, sextTo } from '../util';
import { Instruction, PseudoOp } from './assembly';
import { IO } from './io';
import { FullMachineState, MachineState, MachineStateUpdate,
         RegIdentifier } from './state';
import { Symbols, SymbTable } from './symbols';

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

class InstrLut {
    private spec: IsaSpec;
    private lookupBits: number;
    // spec, mask, val, #bits
    private lut: [InstructionSpec, number, number, number][][];

    public constructor(spec: IsaSpec, lookupBits: number) {
        this.spec = spec;
        this.lookupBits = Math.min(spec.pc.instrBits, lookupBits);
        this.lut = this.genLut(lookupBits);
    }

    public lookup(ir: number): [InstructionSpec, number, number, number][] {
        const idx = maskTo(ir >> (this.spec.pc.instrBits - this.lookupBits),
                           this.lookupBits);

        return this.lut[idx];
    }

    private genLut(lookupBits: number) {
        const lut: [InstructionSpec, number, number, number][][] = [];

        for (let i = 0; i < Math.pow(2, lookupBits); i++) {
            lut.push([]);
        }

        for (const instr of this.spec.instructions) {
            let mask = 0;
            let val = 0;
            let totalBits = 0;
            let firstNBits = [0];

            // Sort them so fields are in the right order
            const fields = instr.fields.slice(0).sort(
                (left, right) => right.bits[0] - left.bits[0]);

            for (const field of fields) {
                const numBits = field.bits[0] - field.bits[1] + 1;
                const needBits = this.lookupBits -
                                 (this.spec.pc.instrBits - field.bits[0] - 1);
                // Take the most significant X bits from this field
                const whichBits = Math.min(numBits, needBits);

                if (field.kind === 'const') {
                    if (whichBits > 0) {
                        // thinkin bout thos bits
                        const thosBits = field.val >> (numBits - whichBits);
                        firstNBits = firstNBits.map(bits => (bits << whichBits) | thosBits);
                    }

                    const babymask = maskTo(-1, numBits);
                    mask |= babymask << field.bits[1];
                    val |= (field.val & babymask) << field.bits[1];
                    totalBits += numBits;
                } else if (whichBits > 0) {
                    const newFirstNBits: number[] = [];

                    // In this case, we need to add all 2^whichBits
                    // combinations
                    for (let i = 0; i < Math.pow(2, whichBits); i++) {
                        for (const bits of firstNBits) {
                            newFirstNBits.push((bits << whichBits) | i);
                        }
                    }

                    firstNBits = newFirstNBits;
                }
            }

            const entry: [InstructionSpec, number, number, number] =
                [instr, mask, val, totalBits];
            for (const bits of firstNBits) {
                lut[bits].push(entry);
            }
        }

        return lut;
    }
}

type RegAliasLut = {[prefix: string]: (string|null)[]};

class Isa {
    public spec: IsaSpec;
    private lut: InstrLut;
    private regAliasLut: RegAliasLut;

    public constructor(spec: IsaSpec) {
        // 64 entries is a nice cozy size without being too gigantic
        const LUT_SIZE = 6;

        this.spec = spec;
        this.lut = new InstrLut(this.spec, LUT_SIZE);
        this.regAliasLut = this.genRegAliasLut();
    }

    // Misc helper functions

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

    // Decoding

    public decode(ir: number): [InstructionSpec, Fields] {
        const matches = [];
        const candidates = this.lut.lookup(ir);

        for (const instrTuple of candidates) {
            const [instr, mask, val, bits] = instrTuple;
            if ((ir & mask) === val) {
                matches.push({bits, instr});
            }
        }

        if (!matches.length) {
            const unsigned = forceUnsigned(ir, this.spec.pc.instrBits);
            throw new Error(`cannot decode instruction ` +
                            `0x${unsigned.toString(16)}`);
        }

        matches.sort((left, right) => right.bits - left.bits);

        const instruction = matches[0].instr;
        return [instruction, this.genFields(ir, instruction)];
    }

    // Disassembly

    public lookupRegAlias(prefix: string, regno: number): string|null {
        return this.regAliasLut[prefix][regno];
    }

    public disassemble(pc: number, ir: number, symbols: Symbols,
                       ascii?: boolean): string|null {
        let spec: InstructionSpec|null;
        let fields: Fields|null;

        try {
            [spec, fields] = this.decode(ir);
        } catch (err) {
            spec = fields = null;
        }

        if (!spec || !fields) {
            // If cannot disassemble and a printable ascii character,
            // stick that bad boy in there
            if (ascii && ' '.charCodeAt(0) <= ir && ir <= '~'.charCodeAt(0)) {
                return `'${String.fromCharCode(ir)}'`;
            } else {
                return null;
            }
        }

        return this.reassemble(pc, spec, fields, symbols);
    }

    // State management

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

    private genRegAliasLut(): RegAliasLut {
        const lut: RegAliasLut = {};

        for (const reg of this.spec.regs) {
            if (reg.kind === 'reg-range') {
                lut[reg.prefix] = new Array(reg.count).fill(null);

                if (reg.aliases) {
                    for (const alias in reg.aliases) {
                        const regno = reg.aliases[alias];
                        const current = lut[reg.prefix][regno];
                        // Make sure we behave deterministically: If we
                        // have a collision, choose the
                        // lexicographically smaller alias
                        if (!current || current > alias) {
                            lut[reg.prefix][regno] = alias;
                        }
                    }
                }
            }
        }

        return lut;
    }

    private genFields(ir: number, instr: InstructionSpec): Fields {
        const fields: Fields = {regs: {}, imms: {}};

        for (const field of instr.fields) {
            if (field.kind === 'const') {
                continue;
            }

            const numBits = field.bits[0] - field.bits[1] + 1;
            let val = maskTo(ir >> field.bits[1], numBits);

            if (field.kind === 'reg') {
                fields.regs[field.name] = [field.prefix, val];
            } else if (field.kind === 'imm') {
                if (field.sext) {
                    val = sextTo(val, numBits);
                }
                fields.imms[field.name] = val;
            }
        }

        return fields;
    }

    private reassemble(pc: number, spec: InstructionSpec, fields: Fields,
                       symbols: Symbols): string {
        const operands: string[] = [];

        for (const field of spec.fields) {
            switch (field.kind) {
                case 'const':
                    // Not provided in assembly code, so skip
                    break;

                case 'imm':
                    let labels: string[] = [];
                    if (field.label) {
                        const targetPc = pc + this.spec.pc.increment +
                                         fields.imms[field.name];
                        labels = symbols.getAddrSymbols(targetPc);
                    }

                    if (labels.length > 0) {
                        operands.push(labels[0]);
                    } else {
                        operands.push(fields.imms[field.name].toString());
                    }
                    break;

                case 'reg':
                    const regid = fields.regs[field.name];
                    const str = (typeof regid === 'string') ? regid :
                                regid[0] + (this.lookupRegAlias(...regid) || regid[1]);

                    operands.push(str);
            }
        }

        const ops = operands.join(', ');

        return ops ? `${spec.op} ${ops}` : spec.op;
    }
}

export { Isa, IsaSpec, Fields, InstructionSpec, Reg, AliasContext, AliasFields,
         AliasSpec };
