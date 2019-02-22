import { Isa, SymbTable } from '../../isa';

interface AsmContext {
    isa: Isa;
    symbtable: SymbTable;
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
    return isa.spec.mem.word / isa.spec.mem.addressability;
}

export { AsmContext, OpOperands, PseudoOpSpec, OpSpec, oneWord };
