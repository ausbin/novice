import { Debugger, IO, Isa, MachineStateUpdate } from 'novice';

type UpdatesHandler = (updates: MachineStateUpdate[]) => void;

class SnitchDebugger extends Debugger {
    private onUpdates: UpdatesHandler;

    public constructor(isa: Isa, io: IO, maxExec: number,
                       onUpdates: UpdatesHandler) {
        super(isa, io, maxExec);

        this.onUpdates = onUpdates;
    }

    protected applyUpdates(updates: MachineStateUpdate[]):
            MachineStateUpdate[] {
        this.onUpdates(updates);
        return super.applyUpdates(updates);
    }
}

export { UpdatesHandler, SnitchDebugger };
