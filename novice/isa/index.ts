import { Assembly, Instruction, IntegerOperand, LabelOperand, PseudoOp,
         RegisterOperand, Section, StringOperand } from './assembly';
import { DummyIsa } from './dummy';
import { IO, StreamIO } from './io';
import { Fields, getAliases, InstructionSpec, Isa, Reg,
         regPrefixes } from './isa';
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

export { getIsa, isas,
         // assembly
         Assembly, Section, Instruction, RegisterOperand, IntegerOperand,
         LabelOperand, PseudoOp, StringOperand,
         // io
         IO, StreamIO,
         // isa
         Isa, InstructionSpec, Fields, Reg, regPrefixes, getAliases,
         // state
         RegIdentifier, MachineState, MachineStateUpdate };
