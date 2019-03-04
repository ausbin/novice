import { BaseSymbols, Fields, InstructionSpec, IO, Isa, Symbols, SymbTable } from '../isa';
import { maskTo, maxUnsignedVal, sextTo } from '../util';
import { Simulator } from './simulator';

class Debugger extends Simulator {
    protected nextBreakpoint: number;
    // Map of address -> breakpoint number
    protected breakpoints: {[addr: number]: number};
    protected interrupt: boolean;
    protected symbols: Symbols;

    public constructor(isa: Isa, io: IO, maxExec: number) {
        super(isa, io, maxExec);

        this.nextBreakpoint = 0;
        this.breakpoints = {};
        this.interrupt = false;
        this.symbols = new BaseSymbols();
    }

    public getSymbols(): Symbols {
        return this.symbols;
    }

    // continue
    public async run(): Promise<void> {
        // How many instructions to execute before freeing up the event
        // loop
        const BURST_SIZE = 1 << 10;

        // Ignore breakpoints the first time through the loop
        // This way, if you've stopped at a breakpoint and press
        // "continue" it actually will
        let first = true;
        // Reset dynamic instruction count for each "continuation"
        this.numExec = 0;
        // Only want to get interrupted while we're in the loop below
        this.interrupt = false;

        // Break up execution into units of BURST_SIZE so we don't clog
        // up the event loop
        await new Promise<void>((resolve, reject) => {
            async function runBurst(this: Debugger) {
                let i = 0;

                while ((first || !this.breakpoints.hasOwnProperty(this.state.pc))
                       && !this.state.halted && !this.interrupt) {
                    if (this.maxExec >= 0 && this.numExec >= this.maxExec) {
                        reject(new Error(`hit maximum executed instruction count ` +
                                         `${this.maxExec}. this may indicate an ` +
                                         `infinite loop in code. continuing will ` +
                                         `continue execution for another ` +
                                         `${this.maxExec} instructions.`));
                        return;
                    }

                    if (i >= BURST_SIZE) {
                        setTimeout(runBurst.bind(this), 0);
                        return;
                    }

                    first = false;
                    i++;
                    await this.step();
                }

                resolve();
            }

            runBurst.bind(this)();
        });

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

    public disassemble(pc: number, ir: number, ascii?: boolean): string|null {
        return this.isa.disassemble(pc, ir, this.symbols, ascii);
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
            const labels = this.symbols.getAddrSymbols(pc);
            const disassembled = this.disassemble(pc, word, true);

            result.push([pc, word, sext, disassembled, labels]);
        }

        return result;
    }

    // Interrupt execution (e.g. infinite loop)
    public onInterrupt(): void {
        this.interrupt = true;
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
