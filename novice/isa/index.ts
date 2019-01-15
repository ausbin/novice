import { IO } from './io';
import { Fields, Instruction, Isa, Reg } from './isa';
import { Lc3Isa } from './lc3';
import { MachineState, MachineStateUpdate, RegIdentifier } from './state';

const isas: {[s: string]: Isa} = {
    lc3: Lc3Isa,
};

function getIsa(isaName: string): Isa {
    if (!isas.hasOwnProperty(isaName)) {
        throw new Error(`no such isa \`${isaName}'\n`);
    }

    return isas[isaName];
}

export { Isa, Instruction, isas, Lc3Isa, MachineState, MachineStateUpdate,
         RegIdentifier, Fields, Reg, getIsa, IO };
