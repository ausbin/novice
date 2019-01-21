import { Fields, InstructionSpec, IO, Isa } from '../isa';
import { maskTo } from '../util';
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
        if (addr < 0) {
            throw new Error('cannot set breakpoint for negative address ' +
                            addr);
        }

        if (addr > Math.abs(maskTo(-1, this.isa.mem.space))) {
            throw new Error(`address ${addr.toString(16)} is too large`);
        }

        if (this.breakpoints.hasOwnProperty(addr)) {
            throw new Error(`address 0x${addr.toString(16)} is already a ` +
                            `breakpoint`);
        }

        this.breakpoints[addr] = this.nextBreakpoint++;
    }

    public disassembleAt(pc: number): string {
        return this.disassemble(this.load(pc));
    }

    public disassemble(ir: number): string {
        let spec: InstructionSpec|null;
        let fields: Fields|null;

        try {
            [spec, fields] = this.decode(ir);
        } catch (err) {
            spec = fields = null;
        }

        if (!spec || !fields) {
            // Cannot disassemble
            // TODO: include some kind of message?
            return `0x${ir.toString(16)} (?)`;
        }

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

        return `${spec.op} ${operands.join(', ')}`;
    }
}

export { Debugger };
