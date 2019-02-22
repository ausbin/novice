import { Isa, MachineCodeSection, SymbTable } from 'novice';
import { Writable } from 'stream';
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

    public symbFileExt(): string { return 'sym'; }

    public serializeSymb(symbtable: SymbTable, fp: Writable) {
        const symbols = Object.keys(symbtable);
        symbols.sort((leftSymb, rightSymb) =>
            symbtable[leftSymb] - symbtable[rightSymb]);

        for (const symb of symbols) {
            fp.write(`${symbtable[symb].toString(16)}\t${symb}\n`);
        }
    }

    // Big endian
    private writeWord(isa: Isa, word: number, fp: Writable): void {
        const numBytes = Math.ceil(isa.spec.mem.word / 8);
        const chunk = new Uint8Array(numBytes);

        for (let i = 0; i < numBytes; i++) {
            chunk[i] = word >> ((numBytes - i - 1) << 3);
        }

        fp.write(chunk);
    }
}

export { ComplxObjectFileSerializer };
