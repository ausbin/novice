import { Buffer } from 'buffer';
import { Assembler, AssemblerConfig, MachineCodeSection, SymbTable } from 'novice';
import { Readable, Writable } from 'stream';
import { Serializer } from './serializers';

class StreamAssembler extends Assembler {
    public async assemble(fp: Readable):
            Promise<[SymbTable, MachineCodeSection[]]> {
        const endPromise = new Promise(resolve => {
            fp.on('end', resolve);
        });

        let err: Error|null = null;

        fp.on('data', (buf: string|Buffer) => {
            // If already broken, skip this chunk
            if (err) {
                return;
            }

            let str: string;
            if (typeof buf === 'string') {
                str = buf;
            } else {
                // TODO: consider partial UTF-8 sequences
                str = buf.toString();
            }

            try {
                this.feedChars(str);
            } catch (e) {
                err = e;
            }
        });

        await endPromise;

        if (err) {
            throw err;
        }

        return this.codegen(this.finishParsing());
    }
}

export { StreamAssembler };
