import { Writable } from 'stream';
import { Isa } from '../../isa';
import { MachineCodeSection } from '../codegen';
import { Serializer } from './serializer';

class ComplxObjectFileSerializer implements Serializer {
    public fileExt(): string { return 'obj'; }

    public serialize(isa: Isa, code: MachineCodeSection[], fp: Writable): void {
        for (const section of code) {
            this.writeWord(isa, section.startAddr, fp);
            this.writeWord(isa, section.words.length, fp);

            for (const word of section.words) {
                this.writeWord(isa, word, fp);
            }
        }
    }

    // Big endian
    private writeWord(isa: Isa, word: number, fp: Writable): void {
        const numBytes = Math.ceil(isa.mem.word / 8);
        const chunk = new Uint8Array(numBytes);

        for (let i = 0; i < numBytes; i++) {
            chunk[i] = word >> ((numBytes - i - 1) << 3);
        }

        fp.write(chunk);
    }
}

export { ComplxObjectFileSerializer };
