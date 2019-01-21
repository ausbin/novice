import { IO, Isa } from '../isa';
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
        while (!this.breakpoints.hasOwnProperty(this.pc)
               && !this.halted && !this.interrupt) {
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
}

export { Debugger };
