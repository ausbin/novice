import { Fields, InstructionSpec, IO, Isa } from '../isa';
import { maskTo, maxUnsignedVal, sextTo } from '../util';
import { Simulator } from './simulator';

class Debugger extends Simulator {
    protected nextBreakpoint: number;
    // Map of address -> breakpoint number
    protected breakpoints: {[addr: number]: number};
    protected interrupt: boolean;

    public constructor(isa: Isa, io: IO) {
        super(isa, io);

        this.nextBreakpoint = 0;
        this.breakpoints = {};
        this.interrupt = false;
    }

    // continue
    public async cont(): Promise<void> {
        // Ignore breakpoints the first time through the loop
        // This way, if you've stopped at a breakpoint and press
        // "continue" it actually will
        let first = true;

        while ((first || !this.breakpoints.hasOwnProperty(this.pc))
               && !this.halted && !this.interrupt) {
            first = false;
            await this.step();
        }

        this.interrupt = false;
    }

    public addBreakpoint(addr: number): void {
        this.validateAddr(addr);

        if (this.breakpoints.hasOwnProperty(addr)) {
            throw new Error(`address 0x${addr.toString(16)} is already a ` +
                            `breakpoint`);
        }

        this.breakpoints[addr] = this.nextBreakpoint++;
    }

    public disassembleAt(pc: number): string|null {
        return this.disassemble(this.load(pc));
    }

    public disassemble(ir: number): string|null {
        let spec: InstructionSpec|null;
        let fields: Fields|null;

        try {
            [spec, fields] = this.decode(ir);
        } catch (err) {
            spec = fields = null;
        }

        if (!spec || !fields) {
            return null;
        }

        return this.reassemble(spec, fields);
    }

    public reassemble(spec: InstructionSpec, fields: Fields): string {
        const operands: string[] = [];

        for (const field of spec.fields) {
            switch (field.kind) {
                case 'const':
                    // Not provided in assembly code, so skip
                    break;

                case 'imm':
                    // TODO: labels
                    operands.push(fields.imms[field.name].toString());
                    break;

                case 'reg':
                    // TODO: use reg aliases if available
                    const regid = fields.regs[field.name];
                    const str = (typeof regid === 'string')
                              ? regid
                              : regid.join('');
                    operands.push(str);
            }
        }

        const ops = operands.join(', ');

        return ops ? `${spec.op} ${ops}` : spec.op;
    }

    public disassembleRegion(fromPc: number, toPc: number):
            [number, number, number, string|null][] {
        this.validateAddr(fromPc);
        this.validateAddr(toPc);

        if (fromPc > toPc) {
            [fromPc, toPc] = [toPc, fromPc];
        }

        const result: [number, number, number, string|null][] = [];

        for (let pc = fromPc; pc <= toPc; pc += this.isa.pc.increment) {
            const word = this.load(pc);
            const sext = sextTo(word, this.isa.mem.word);
            result.push([pc, word, sext, this.disassemble(word)]);
        }

        return result;
    }

    private validateAddr(addr: number): void {
        // TODO: check if NaN or infinity or whatever

        if (addr < 0) {
            throw new Error('cannot set breakpoint for negative address ' +
                            addr);
        }

        if (addr > maxUnsignedVal(this.isa.mem.space)) {
            throw new Error(`address 0x${addr.toString(16)} is too large`);
        }
    }
}

export { Debugger };
