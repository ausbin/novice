import { complxOpSpec } from './complx';
import { AsmContext, OpOperands, OpSpec, PseudoOpSpec } from './opspec';

const opSpecs: {[s: string]: PseudoOpSpec} = {
    complx: complxOpSpec,
};

export { AsmContext, OpOperands, OpSpec, PseudoOpSpec, complxOpSpec, opSpecs };
