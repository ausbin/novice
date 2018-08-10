import { Buffer } from 'buffer';
import { Readable } from 'stream';
import { isDecimalDigit, isHexDigit, isWordChar } from './lex';
import { Line, Scanner, Token } from './scanner';

interface RegisterOperand {
    kind: 'reg';
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
    op: string;
    operands: (RegisterOperand|IntegerOperand|LabelOperand)[];
}

interface PseudoOp {
    op: string;
    operand: StringOperand|IntegerOperand|undefined;
}

interface Section {
    startAddr: number;
    instructions: (Instruction|PseudoOp)[];
}

interface Assembly {
    sections: Section[];
    labels: {[s: string]: number};
}

class Assembler {
    private scanner: Scanner;
    private assembly: Assembly;
    private newSection: boolean;

    public constructor(fp: Readable) {
        this.scanner = new Scanner(fp);
        this.assembly = {sections: [], labels: {}};
        this.newSection = true;
    }

    public async parse(): Promise<Assembly> {
        await this.scanner.scan();
        return this.assembly;
    }
}

export { Assembler, Assembly, Section, Instruction, RegisterOperand,
         IntegerOperand, LabelOperand };
