import { Fields, Instruction, IO, Isa, Reg, RegIdentifier } from '../isa';

class Simulator {
    public pc: number;
    public mem: {[addr: number]: number};
    public regs: {
        solo: {[name: string]: number};
        range: {[prefix: string]: number[]};
    };
    public halted: boolean;
    private isa: Isa;
    private io: IO;

    public constructor(isa: Isa, io: IO) {
        this.isa = isa;
        this.io = io;
        this.pc = isa.pc.resetVector;
        this.mem = {};
        this.regs = {
            solo: {},
            range: {},
        };
        this.halted = false;

        this.resetRegs();
    }

    public run(): void {
        while (!this.halted) {
            const ir = this.load(this.pc);
            this.pc += this.isa.pc.increment;

            const [instr, fields] = this.decode(ir);
            // Don't pass the incremented PC
            const state = {pc: this.pc - this.isa.pc.increment,
                           reg: this.reg.bind(this),
                           load: this.load.bind(this)};
            const updates = instr.sim(state, this.io, fields);

            for (const update of updates) {
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
                }
            }
        }
    }

    public load(addr: number): number {
        if (this.mem.hasOwnProperty(addr)) {
            return this.mem[addr];
        } else {
            return 0;
        }
    }

    public store(addr: number, val: number): void {
        this.mem[addr] = val & ~(-1 << this.isa.mem.word);
    }

    public reg(id: RegIdentifier): number {
        const reg = this.lookupRegSpec(id);
        let val;

        if (typeof id === 'string') {
            val = this.regs.solo[id];
        } else {
            val = this.regs.range[id[0]][id[1]];
        }

        if (reg.sext && (val & (1 << (reg.bits - 1)))) {
            val |= -1 << reg.bits;
        }

        return val;
    }

    public regSet(id: RegIdentifier, val: number) {
        const reg = this.lookupRegSpec(id);

        val &= ~(-1 << reg.bits);

        if (typeof id === 'string') {
            this.regs.solo[id] = val;
        } else {
            this.regs.range[id[0]][id[1]] = val;
        }
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

    private decode(ir: number): [Instruction, Fields] {
        // TODO: ridiculously inefficient. idea for improvement: binary
        //       tree of depth like 8 to cut down on iteration time
        const matches = [];

        for (const instr of this.isa.instructions) {
            let mask = 0;
            let val = 0;
            let totalBits = 0;

            for (const field of instr.fields) {
                if (field.kind !== 'const') {
                    continue;
                }

                const numBits = field.bits[0] - field.bits[1] + 1;
                const babymask = ~(-1 << numBits);
                mask |= babymask << field.bits[1];
                val |= (field.val & babymask) << field.bits[1];
                totalBits += numBits;
            }

            if ((ir & mask) === val) {
                matches.push({bits: totalBits, instr});
            }
        }

        if (!matches.length) {
            throw new Error(`cannot decode instruction 0x${ir.toString(16)}`);
        }

        matches.sort((left, right) => right.bits - left.bits);

        const instruction = matches[0].instr;
        return [instruction, this.genFields(ir, instruction)];
    }

    private genFields(ir: number, instr: Instruction): Fields {
        const fields: Fields = {regs: {}, imms: {}};

        for (const field of instr.fields) {
            if (field.kind === 'const') {
                continue;
            }

            const numBits = field.bits[0] - field.bits[1] + 1;
            let val = (ir >> field.bits[1]) & ~(-1 << numBits);

            if (field.kind === 'reg') {
                fields.regs[field.name] = [field.prefix, val];
            } else if (field.kind === 'imm') {
                // TODO: probs should be helper function
                if (field.sext && (val & (1 << (numBits - 1)))) {
                    val |= -1 << numBits;
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
