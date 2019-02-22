import { Fields, InstructionSpec, IO, Isa, SymbTable } from '../isa';
import { maskTo, maxUnsignedVal, sextTo } from '../util';
import { Simulator } from './simulator';
import { Symbols } from './symbols';

type RegAliasLut = {[prefix: string]: (string|null)[]};
type InvSymbTable = {[addr: number]: string[]};

class Debugger extends Simulator implements Symbols {
    protected nextBreakpoint: number;
    // Map of address -> breakpoint number
    protected breakpoints: {[addr: number]: number};
    protected interrupt: boolean;
    protected symbTable: SymbTable;
    protected invSymbTable: InvSymbTable;
    protected regAliasLut: RegAliasLut;

    public constructor(isa: Isa, io: IO, maxExec: number) {
        super(isa, io, maxExec);

        this.nextBreakpoint = 0;
        this.breakpoints = {};
        this.interrupt = false;
        this.symbTable = {};
        this.invSymbTable = {};
        this.regAliasLut = this.genRegAliasLut(isa);
    }

    public getSymbTable(): SymbTable {
        return Object.assign({}, this.symbTable);
    }

    // continue
    public async cont(): Promise<void> {
        // Ignore breakpoints the first time through the loop
        // This way, if you've stopped at a breakpoint and press
        // "continue" it actually will
        let first = true;
        // Reset dynamic instruction count for each "continuation"
        this.numExec = 0;

        while ((first || !this.breakpoints.hasOwnProperty(this.state.pc))
               && !this.state.halted && !this.interrupt) {
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
                        const targetPc = pc + this.isa.spec.pc.increment +
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
                    const regid = fields.regs[field.name];
                    const str = (typeof regid === 'string') ? regid :
                                regid[0] + (this.lookupRegAlias(...regid) || regid[1]);

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

        for (let pc = fromPc; pc <= toPc; pc += this.isa.spec.pc.increment) {
            const word = this.load(pc);
            const sext = sextTo(word, this.isa.spec.mem.word);
            const labels = this.labelsForAddr(pc);
            let disassembled = this.disassemble(pc, word);

            // If cannot disassemble and a printable ascii character,
            // stick that bad boy in there
            if (!disassembled && ' '.charCodeAt(0) <= word &&
                    word <= '~'.charCodeAt(0)) {
                disassembled = `'${String.fromCharCode(word)}'`;
            }

            result.push([pc, word, sext, disassembled, labels]);
        }

        return result;
    }

    public hasSymbol(symb: string): boolean {
        return symb in this.symbTable;
    }

    public setSymbol(symb: string, addr: number): void {
        if (this.hasSymbol(symb)) {
            const oldAddr = this.symbTable[symb];
            // update inverted
            const symbols = this.invSymbTable[oldAddr];
            symbols.splice(symbols.indexOf(symb), 1);
        }

        this.symbTable[symb] = addr;

        if (!(addr in this.invSymbTable)) {
            this.invSymbTable[addr] = [];
        }

        this.invSymbTable[addr].push(symb);
        // Determinism!
        this.invSymbTable[addr].sort();
    }

    public setSymbols(symbtable: SymbTable): void {
        for (const symb in symbtable) {
            this.setSymbol(symb, symbtable[symb]);
        }
    }

    public getSymbolAddr(symb: string): number {
        if (!(symb in this.symbTable)) {
            throw new Error(`no such symbol \`${symb}'`);
        }

        return this.symbTable[symb];
    }

    public getAddrSymbols(addr: number): string[] {
        if (!(addr in this.invSymbTable)) {
            return [];
        }

        return this.invSymbTable[addr];
    }

    protected lookupRegAlias(prefix: string, regno: number): string|null {
        return this.regAliasLut[prefix][regno];
    }

    private genRegAliasLut(isa: Isa): RegAliasLut {
        const lut: RegAliasLut = {};

        for (const reg of isa.spec.regs) {
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

        if (addr > maxUnsignedVal(this.isa.spec.mem.space)) {
            throw new Error(`address 0x${addr.toString(16)} is too large`);
        }
    }
}

export { Debugger };
