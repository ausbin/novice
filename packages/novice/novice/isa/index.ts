import { Assembly, Instruction, IntegerOperand, LabelOperand, PseudoOp,
         RegisterOperand, Section, StringOperand } from './assembly';
import { MachineCodeSection } from './codegen';
import { dummyIsaSpec } from './dummy';
import { IO } from './io';
import { AliasContext, AliasFields, AliasSpec, Fields, InstructionSpec, Isa,
         IsaSpec, Reg } from './isa';
import { lc2200IsaSpec } from './lc2200';
import { lc3IsaSpec } from './lc3';
import { MachineStateLogEntry } from './log';
import { rama2200IsaSpec } from './rama2200';
import { FullMachineState, MachineState, MachineStateUpdate,
         RegIdentifier } from './state';
import { BaseSymbols, Symbols, SymbTable } from './symbols';

const isaSpecs: {[s: string]: IsaSpec} = {
    dummy: dummyIsaSpec,
    lc3: lc3IsaSpec,
    lc2200: lc2200IsaSpec,
    rama2200: rama2200IsaSpec,
};

function getIsa(isaName: string): Isa {
    if (!(isaName in isaSpecs)) {
        throw new Error(`no such isa \`${isaName}'\n`);
    }

    return new Isa(isaSpecs[isaName]);
}

export { getIsa, isaSpecs,
         // assembly
         Assembly, Section, Instruction, RegisterOperand, IntegerOperand,
         LabelOperand, PseudoOp, StringOperand,
         // codegen
         MachineCodeSection,
         // io
         IO,
         // isa
         Isa, IsaSpec, InstructionSpec, Fields, Reg, AliasContext, AliasFields,
         AliasSpec,
         // state
         RegIdentifier, FullMachineState, MachineState, MachineStateUpdate,
         // symbols
         BaseSymbols, SymbTable, Symbols,
         // log
         MachineStateLogEntry };
