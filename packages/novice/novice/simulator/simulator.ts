import { Fields, FullMachineState, InstructionSpec, IO, Isa,
         MachineCodeSection, MachineStateLogEntry, MachineStateUpdate, Reg,
         RegIdentifier } from '../isa';
import { Memory } from './mem';

class Simulator implements Memory {
    protected state: FullMachineState;
    protected isa: Isa;
    protected io: IO;
    protected maxExec: number;
    protected log: MachineStateLogEntry[];
    protected numExec: number;

    public constructor(isa: Isa, io: IO, maxExec: number) {
        this.state = isa.initMachineState();
        this.isa = isa;
        this.io = io;
        this.maxExec = maxExec;
        this.log = [];
        this.numExec = 0;
    }

    public getPc(): number { return this.state.pc; }

    public isHalted(): boolean { return this.state.halted; }

    // TODO: make this immutable somehow
    public getRegs() { return this.state.regs; }

    public getNumExec() { return this.numExec; }

    public getLogLength(): number {
        return this.log.length;
    }

    public reset(): void {
        this.state = this.isa.initMachineState();
        this.log = [];
        this.numExec = 0;
    }

    public loadSections(sections: MachineCodeSection[]): void {
        const updates: MachineStateUpdate[] = [];

        for (const section of sections) {
            for (let i = 0; i < section.words.length; i++) {
                updates.push({kind: 'mem',
                              addr: section.startAddr + i,
                              val: section.words[i]});
            }
        }

        // Don't create a log entry because no need to ever undo this
        this.applyUpdates(updates);
    }

    public async step(): Promise<void> {
        // If already halted, do nothing
        if (this.state.halted) {
            return;
        }

        this.numExec++;

        const ir = this.load(this.state.pc);
        const [instr, fields] = this.decode(ir);
        // Don't pass the incremented PC
        const state = {pc: this.state.pc,
                       reg: this.reg.bind(this),
                       load: this.load.bind(this)};
        const ret = instr.sim(state, this.io, fields);
        const updates: MachineStateUpdate[] =
            (Promise.resolve(ret) === ret)
            ? await (ret as Promise<MachineStateUpdate[]>)
            : ret as MachineStateUpdate[];

        // Increment PC
        updates.unshift({ kind: 'pc', where: this.state.pc + this.isa.spec.pc.increment });
        this.pushLogEntry(instr, fields, updates);
    }

    public async run(): Promise<void> {
        while (!this.state.halted) {
            if (this.maxExec >= 0 && this.numExec >= this.maxExec) {
                throw new Error(`hit maximum executed instruction count ` +
                                `${this.maxExec}. this may indicate an ` +
                                `infinite loop in code`);
            }

            await this.step();
        }
    }

    public pushLogEntry(instr: InstructionSpec, fields: Fields,
                        updates: MachineStateUpdate[]): void {
        const undo = this.applyUpdates(updates);
        const logEntry: MachineStateLogEntry = {instr, fields, updates,
                                                undo};
        this.log.push(logEntry);
    }

    public rewind(): void {
        while (this.log.length) {
            this.unstep();
        }
    }

    public unstep(): void {
        this.popLogEntry();
    }

    public popLogEntry(): MachineStateLogEntry {
        const logEntry = this.log.pop();

        if (!logEntry) {
            throw new Error('already at the beginning of time');
        }

        this.applyUpdates(logEntry.undo);
        return logEntry;
    }

    public load(addr: number): number {
        return this.isa.stateLoad(this.state, addr);
    }

    public store(addr: number, val: number): void {
        this.isa.stateStore(this.state, addr, val);
    }

    public reg(id: RegIdentifier): number {
        return this.isa.stateReg(this.state, id);
    }

    public regSet(id: RegIdentifier, val: number) {
        this.isa.stateRegSet(this.state, id, val);
    }

    public decode(ir: number): [InstructionSpec, Fields] {
        return this.isa.decode(ir);
    }

    // Return a list of corresponding undoing updates
    protected applyUpdates(updates: MachineStateUpdate[]):
            MachineStateUpdate[] {
        const [newState, undos] =
            this.isa.stateApplyUpdates(this.state, updates);
        this.state = newState;
        return undos;
    }
}

export { Simulator };
