import { Fields, InstructionSpec } from './isa';
import { MachineStateUpdate } from './state';

interface MachineStateDelta {
    update: MachineStateUpdate;
    // old reg value, memory location value, etc
    old: number;
}

interface MachineStateLogEntry {
    instr: InstructionSpec;
    fields: Fields;
    deltas: MachineStateDelta[];
}

export { MachineStateDelta, MachineStateLogEntry };
