interface RegisterOperand {
    kind: 'reg';
    prefix: string;
    num: number;
}

interface IntegerOperand {
    kind: 'int';
    val: number;
}

interface LabelOperand {
    kind: 'label';
    label: string;
}

interface StringOperand {
    kind: 'string';
    contents: string;
}

interface Instruction {
    kind: 'instr';
    line: number;
    op: string;
    operands: (RegisterOperand|IntegerOperand|LabelOperand)[];
}

interface PseudoOp {
    kind: 'pseudoop';
    line: number;
    op: string;
    operand: StringOperand|IntegerOperand|LabelOperand|undefined;
}

interface Section {
    startAddr: number;
    instructions: (Instruction|PseudoOp)[];
}

interface Assembly {
    sections: Section[];
    labels: {[s: string]: [number, number]};
}

export { Assembly, Section, Instruction, RegisterOperand, IntegerOperand,
         LabelOperand, PseudoOp, StringOperand };
