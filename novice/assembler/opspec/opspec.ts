import { Isa } from '../isa';

interface AsmContext {
    isa: Isa;
    symbtable: {[s: string]: number};
}

interface OpOperandSpec {
    kind: 'int'|'label'|'string';
    name: string;
}

interface OpOperands {
    ints: {[s: string]: number};
    labels: {[s: string]: string};
    strings: {[s: string]: string};
}

interface OpSpec {
    name: string;
    operands: OpOperandSpec[];
    asm: (ctx: AsmContext, operands: OpOperands) => number[];
}

interface PseudoOpSpec {
    ops: OpSpec[];
}

export { AsmContext, OpOperands, PseudoOpSpec };
