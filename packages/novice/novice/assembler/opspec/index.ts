import { complxOpSpec } from './complx';
import { AsmContext, OpOperands, OpSpec, PseudoOpSpec } from './opspec';
import { wordOpSpec } from './word';

const opSpecs: {[s: string]: PseudoOpSpec} = {
    complx: complxOpSpec,
    word: wordOpSpec,
};

export { AsmContext, OpOperands, OpSpec, PseudoOpSpec, complxOpSpec,
         wordOpSpec, opSpecs };
