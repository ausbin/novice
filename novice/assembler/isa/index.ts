import { Isa } from './isa';
import { Lc3Isa } from './lc3';
import { MachineState, MachineStateUpdate } from './state';

const isas: {[s: string]: Isa} = {
    lc3: Lc3Isa,
};

export { Isa, isas, Lc3Isa, MachineState, MachineStateUpdate };
