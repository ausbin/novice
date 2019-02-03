import { Fields, InstructionSpec, IO, Isa, SymbTable } from '../isa';
import { maskTo, maxUnsignedVal, sextTo } from '../util';
import { Simulator } from './simulator';

class Debugger extends Simulator {
    protected nextBreakpoint: number;
    // Map of address -> breakpoint number
    protected breakpoints: {[addr: number]: number};
    protected interrupt: boolean;
    protected symbTable: SymbTable;

    public constructor(isa: Isa, io: IO, maxExec: number) {
        super(isa, io, maxExec);

        this.nextBreakpoint = 0;
        this.breakpoints = {};
        this.interrupt = false;
        this.symbTable = {};
    }

    public getSymbTable(): SymbTable {
        return this.symbTable;
    }

    // continue
    public async cont(): Promise<void> {
        // Ignore breakpoints the first time through the loop
        // This way, if you've stopped at a breakpoint and press
        // "continue" it actually will
        let first = true;
        // Reset dynamic instruction count for each "continuation"
        this.numExec = 0;

        while ((first || !this.breakpoints.hasOwnProperty(this.pc))
               && !this.halted && !this.interrupt) {
            if (this.maxExec >= 0 && this.numExec >= this.maxExec) {
                throw new Error(`hit maximum executed instruction count ` +
                                `${this.maxExec}. this may indicate an ` +
                                `infinite loop in code. continuing will ` +
                                `continue execution for another ` +
                                `${this.maxExec} instructions.`);
            }

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
        return this.disassemble(pc, this.load(pc));
    }

    public disassemble(pc: number, ir: number): string|null {
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

        return this.reassemble(pc, spec, fields);
    }

    public reassemble(pc: number, spec: InstructionSpec, fields: Fields): string {
        const operands: string[] = [];

        for (const field of spec.fields) {
            switch (field.kind) {
                case 'const':
                    // Not provided in assembly code, so skip
                    break;

                case 'imm':
                    let labels: string[] = [];
                    if (field.label) {
                        const targetPc = pc + this.isa.pc.increment +
                                         fields.imms[field.name];
                        labels = this.labelsForAddr(targetPc);
                    }

                    if (labels.length > 0) {
                        operands.push(labels[0]);
                    } else {
                        operands.push(fields.imms[field.name].toString());
                    }
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
            // pc, unsigned, signed, instruction, labels
            [number, number, number, string|null, string[]][] {
        this.validateAddr(fromPc);
        this.validateAddr(toPc);

        if (fromPc > toPc) {
            [fromPc, toPc] = [toPc, fromPc];
        }

        const result: [number, number, number, string|null, string[]][] = [];

        for (let pc = fromPc; pc <= toPc; pc += this.isa.pc.increment) {
            const word = this.load(pc);
            const sext = sextTo(word, this.isa.mem.word);
            const labels = this.labelsForAddr(pc);
            result.push([pc, word, sext, this.disassemble(pc, word), labels]);
        }

        return result;
    }

    private labelsForAddr(pc: number): string[] {
        // TODO: replace with something less grossly inefficient
        const results: string[] = [];

        for (const label in this.symbTable) {
            if (this.symbTable[label] === pc) {
                results.push(label);
            }
        }

        // Make sure order is deterministic
        results.sort();

        return results;
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
