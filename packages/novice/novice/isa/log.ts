import { Fields, InstructionSpec } from './isa';
import { MachineStateUpdate } from './state';

interface MachineStateLogEntry {
    instr: InstructionSpec;
    fields: Fields;
    updates: MachineStateUpdate[];
    undo: MachineStateUpdate[];
}

export { MachineStateLogEntry };
