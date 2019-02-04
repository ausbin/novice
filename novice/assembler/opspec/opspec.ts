import { Isa } from '../../isa';

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
    op: string;
    operands: OpOperandSpec[];
    asm: (ctx: AsmContext, operands: OpOperands) => number[];
    size?: (isa: Isa) => number;
}

interface PseudoOpSpec {
    ops: OpSpec[];
}

// Size is one word
function oneWord(isa: Isa) {
    return isa.mem.word / isa.mem.addressability;
}

export { AsmContext, OpOperands, PseudoOpSpec, OpSpec, oneWord };
