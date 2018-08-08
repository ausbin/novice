import { Buffer } from 'buffer';
import { Readable } from 'stream';

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
    public parse(fp: Readable): Promise<Assembly> {
        return new AssemblerParse().parse(fp);
    }
}

class AssemblerParse {
    private assembly: Assembly;

    public constructor() {
        this.assembly = {sections: [], labels: {}};
    }

    public async parse(fp: Readable): Promise<Assembly> {
        const endPromise = new Promise((resolve) => fp.on('end', () => {
            // send EOF to scanner
            this.nextChar('');
            resolve();
        }));
        fp.on('data', this.onData.bind(this));
        await endPromise;
        return this.assembly;
    }

    private onData(data: string | Buffer) {
        let buf: string;
        if (typeof data === 'string') {
            buf = data;
        } else {
            buf = data.toString();
        }

        for (let i = 0; i < buf.length; i++) {
            this.nextChar(buf.charAt(i));
        }
    }

    // '' is EOF
    private nextChar(c: string) {
        // nothing for now
    }
}

export { Assembler, Assembly, Section, Instruction };
