import { Fields, InstructionSpec, IO, Isa, MachineCodeSection, MachineStateLogEntry,
         MachineStateUpdate, Reg, RegIdentifier } from '../isa';
import { forceUnsigned, maskTo, sextTo } from '../util';
import { Memory } from './mem';

class InstrLut {
    private isa: Isa;
    private lookupBits: number;
    // spec, mask, val, #bits
    private lut: [InstructionSpec, number, number, number][][];

    public constructor(isa: Isa, lookupBits: number) {
        this.isa = isa;
        this.lookupBits = Math.min(isa.pc.instrBits, lookupBits);
        this.lut = this.genLut(lookupBits);
    }

    public lookup(ir: number): [InstructionSpec, number, number, number][] {
        const idx = maskTo(ir >> (this.isa.pc.instrBits - this.lookupBits),
                           this.lookupBits);

        return this.lut[idx];
    }

    private genLut(lookupBits: number) {
        const lut: [InstructionSpec, number, number, number][][] = [];

        for (let i = 0; i < Math.pow(2, lookupBits); i++) {
            lut.push([]);
        }

        for (const instr of this.isa.instructions) {
            let mask = 0;
            let val = 0;
            let totalBits = 0;
            let firstNBits = [0];

            // Sort them so fields are in the right order
            const fields = instr.fields.slice(0).sort(
                (left, right) => right.bits[0] - left.bits[0]);

            for (const field of fields) {
                const numBits = field.bits[0] - field.bits[1] + 1;
                const needBits = this.lookupBits - (this.isa.pc.instrBits - field.bits[0] - 1);
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

class Simulator implements Memory {
    protected pc: number;
    protected mem: {[addr: number]: number};
    protected regs: {
        solo: {[name: string]: number};
        range: {[prefix: string]: number[]};
    };
    protected halted: boolean;
    protected isa: Isa;
    protected io: IO;
    protected maxExec: number;
    protected log: MachineStateLogEntry[];
    protected numExec: number;
    protected lut: InstrLut;

    public constructor(isa: Isa, io: IO, maxExec: number) {
        // 64 entries is a nice cozy size without being too gigantic
        const LUT_SIZE = 6;

        this.isa = isa;
        this.io = io;
        this.maxExec = maxExec;
        this.pc = isa.pc.resetVector;
        this.mem = {};
        this.regs = {
            solo: {},
            range: {},
        };
        this.halted = false;
        this.log = [];
        this.numExec = 0;
        this.lut = new InstrLut(this.isa, LUT_SIZE);

        this.resetRegs();
    }

    public getPc(): number { return this.pc; }

    public isHalted(): boolean { return this.halted; }

    // TODO: make this immutable somehow
    public getRegs() { return this.regs; }

    public loadSections(sections: MachineCodeSection[]): void {
        for (const section of sections) {
            for (let i = 0; i < section.words.length; i++) {
                this.store(section.startAddr + i, section.words[i]);
            }
        }
    }

    public async step(): Promise<void> {
        // If already halted, do nothing
        if (this.halted) {
            return;
        }

        this.numExec++;

        const ir = this.load(this.pc);
        this.pc += this.isa.pc.increment;

        const [instr, fields] = this.decode(ir);
        // Don't pass the incremented PC
        const state = {pc: this.pc - this.isa.pc.increment,
                       reg: this.reg.bind(this),
                       load: this.load.bind(this)};
        const ret = instr.sim(state, this.io, fields);
        const updates: MachineStateUpdate[] =
            (Promise.resolve(ret) === ret)
            ? await (ret as Promise<MachineStateUpdate[]>)
            : ret as MachineStateUpdate[];
        const logEntry: MachineStateLogEntry = {instr, fields, deltas: []};

        for (const update of updates) {
            const delta = {update, old: 0};

            switch (update.kind) {
                case 'reg':
                    delta.old = this.reg(update.reg);
                    break;

                case 'mem':
                    delta.old = this.load(update.addr);
                    break;

                case 'pc':
                    delta.old = this.pc;
                    break;

                case 'halt':
                    // Nothing to back up
                    break;

                default:
                    const _: never = update;
            }

            logEntry.deltas.push(delta);
        }

        this.pushLogEntry(logEntry);
    }

    public async run(): Promise<void> {
        while (!this.halted) {
            if (this.maxExec >= 0 && this.numExec >= this.maxExec) {
                throw new Error(`hit maximum executed instruction count ` +
                                `${this.maxExec}. this may indicate an ` +
                                `infinite loop in code`);
            }

            await this.step();
        }
    }

    public pushLogEntry(logEntry: MachineStateLogEntry) {
        for (const delta of logEntry.deltas) {
            const update = delta.update;
            switch (update.kind) {
                case 'reg':
                    this.regSet(update.reg, update.val);
                    break;

                case 'mem':
                    this.store(update.addr, update.val);
                    break;

                case 'pc':
                    this.pc = update.where;
                    break;

                case 'halt':
                    this.halted = true;
                    break;

                default:
                    const _: never = update;
            }
        }

        this.log.push(logEntry);
    }

    public rewind(): void {
        while (this.log.length) {
            this.unstep();
        }
    }

    public unstep(): void {
        this.popLogEntry();
        this.pc -= this.isa.pc.increment;
    }

    public popLogEntry(): MachineStateLogEntry {
        const logEntry = this.log.pop();

        if (!logEntry) {
            throw new Error('already at the beginning of time');
        }

        for (let i = logEntry.deltas.length - 1; i >= 0; i--) {
            const delta = logEntry.deltas[i];
            const update = delta.update;
            switch (update.kind) {
                case 'reg':
                    this.regSet(update.reg, delta.old);
                    break;

                case 'mem':
                    this.store(update.addr, delta.old);
                    break;

                case 'pc':
                    this.pc = delta.old;
                    break;

                case 'halt':
                    this.halted = false;
                    break;

                default:
                    const _: never = update;
            }
        }

        return logEntry;
    }

    public load(addr: number): number {
        if (this.mem.hasOwnProperty(addr)) {
            return this.mem[addr];
        } else {
            return 0;
        }
    }

    public store(addr: number, val: number): void {
        this.mem[addr] = maskTo(val, this.isa.mem.word);
    }

    public reg(id: RegIdentifier): number {
        const reg = this.lookupRegSpec(id);
        let val;

        if (typeof id === 'string') {
            val = this.regs.solo[id];
        } else {
            val = this.regs.range[id[0]][id[1]];
        }

        if (reg.sext) {
            val = sextTo(val, reg.bits);
        }

        return val;
    }

    public regSet(id: RegIdentifier, val: number) {
        const reg = this.lookupRegSpec(id);
        val = maskTo(val, reg.bits);

        if (typeof id === 'string') {
            this.regs.solo[id] = val;
        } else {
            this.regs.range[id[0]][id[1]] = val;
        }
    }

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
            const unsigned = forceUnsigned(ir, this.isa.pc.instrBits);
            throw new Error(`cannot decode instruction ` +
                            `0x${unsigned.toString(16)}`);
        }

        matches.sort((left, right) => right.bits - left.bits);

        const instruction = matches[0].instr;
        return [instruction, this.genFields(ir, instruction)];
    }

    private lookupRegSpec(id: RegIdentifier): Reg {
        for (const reg of this.isa.regs) {
            if (typeof id === 'string' && reg.kind === 'reg'
                    && reg.name === id ||
                typeof id !== 'string' && reg.kind === 'reg-range'
                    && id[0] === reg.prefix) {
                return reg;
            }
        }

        throw new Error(`unknown register identifier ${id}`);
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

    private resetRegs(): void {
        for (const reg of this.isa.regs) {
            switch (reg.kind) {
                case 'reg':
                    this.regs.solo[reg.name] = 0;
                    break;

                case 'reg-range':
                    this.regs.range[reg.prefix] = new Array<number>(reg.count);
                    for (let i = 0; i < reg.count; i++) {
                        this.regs.range[reg.prefix][i] = 0;
                    }
                    break;
            }
        }
    }
}

export { Simulator };
