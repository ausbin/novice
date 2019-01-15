import { Buffer } from 'buffer';
import { Readable } from 'stream';
import { Isa } from '../../isa';
import { Memory } from '../mem';
import { Loader } from './loader';

type State = 'addr'|'len'|'words';

class ComplxObjectFileLoader implements Loader {
    public load(isa: Isa, fp: Readable, mem: Memory): void {
        const wordBytes = Math.ceil(isa.mem.word / 8);
        const excessBuf = Buffer.alloc(wordBytes);
        let excessLen = 0;
        let pc = 0;
        let wordsLeft = 0;

        let state: State = 'addr';

        while (true) {
            const buf = fp.read();

            if (!buf) {
                break;
            }

            if (buf.length + excessLen < wordBytes) {
                for (const byte of buf) {
                    excessBuf[excessLen++] = byte;
                }
                continue;
            }

            const excess = (excessLen + buf.length) % wordBytes;
            const words = (excessLen + buf.length - excess) / wordBytes;

            for (let i = 0; i < words; i++) {
                let word = 0;

                for (let j = 0; j < wordBytes; j++) {
                    const idx = i * wordBytes + j;
                    const byte = (idx < excessLen) ? excessBuf[idx]
                                                   : buf[idx - excessLen];
                    word |= byte << (8 * (wordBytes - j - 1));
                }

                switch (state) {
                    case 'addr':
                        pc = word;
                        state = 'len';
                        break;

                    case 'len':
                        if (word) {
                            wordsLeft = word;
                            state = 'words';
                        } else {
                            // If we don't expect any words, go ahead
                            // and skip to the next section
                            state = 'addr';
                        }
                        break;

                    case 'words':
                        mem.store(pc, word);
                        pc += Math.ceil(isa.mem.word / isa.mem.addressability);

                        if (!--wordsLeft) {
                            state = 'addr';
                        }
                        break;
                }
            }

            for (let i = 0; i < excess; i++) {
                excessBuf[i] = buf[buf.length - excess + i];
            }
            excessLen = excess;
        }

        if (excessLen) {
            throw new Error(`number of bytes in object file is not ` +
                            `divisible by ${wordBytes}`);
        }
        if (state === 'len') {
            throw new Error('unexpected end-of-file before section length');
        }
        if (state === 'words') {
            throw new Error(`expected ${wordsLeft} more words`);
        }
    }
}

export { ComplxObjectFileLoader };
