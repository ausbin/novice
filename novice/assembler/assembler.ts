import { Buffer } from 'buffer';
import { Readable } from 'stream';
import { Scanner } from './scanner';

interface Instruction {
    op: string;
    operands: (string|number)[];
}

interface Section {
    startAddr: number;
    instructions: Instruction[];
}

interface Assembly {
    sections: Section[];
    labels: {[s: string]: number};
}

class Assembler {
    private scanner: Scanner;

    public constructor(fp: Readable) {
        this.scanner = new Scanner(fp);
    }

    public async parse(): Promise<Assembly> {
        await this.scanner.scan();
        return {sections: [], labels: {}};
    }
}

export { Assembler, Assembly, Section, Instruction };
