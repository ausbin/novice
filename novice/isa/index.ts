import { DummyIsa } from './dummy';
import { IO, StreamIO } from './io';
import { Fields, getAliases, Instruction, Isa, Reg, regPrefixes } from './isa';
import { Lc2200Isa } from './lc2200';
import { Lc3Isa } from './lc3';
import { MachineState, MachineStateUpdate, RegIdentifier } from './state';

const isas: {[s: string]: Isa} = {
    dummy: DummyIsa,
    lc3: Lc3Isa,
    lc2200: Lc2200Isa,
};

function getIsa(isaName: string): Isa {
    if (!isas.hasOwnProperty(isaName)) {
        throw new Error(`no such isa \`${isaName}'\n`);
    }

    return isas[isaName];
}

export { Isa, Instruction, isas, Lc3Isa, MachineState, MachineStateUpdate,
         RegIdentifier, Fields, Reg, getIsa, IO, StreamIO, regPrefixes,
         getAliases };
