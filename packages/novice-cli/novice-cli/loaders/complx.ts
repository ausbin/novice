import { Buffer } from 'buffer';
import { Isa, Memory, Symbols } from 'novice';
import { Readable } from 'stream';
import { Loader } from './loader';

type State = 'addr'|'len'|'words';

class ComplxObjectFileLoader implements Loader {
    public async load(isa: Isa, fp: Readable, mem: Memory): Promise<void> {
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

    public fileExt(): string {
        return 'obj';
    }

    public symbFileExt(): string {
        return 'sym';
    }

    public async loadSymb(fp: Readable, symbols: Symbols): Promise<void> {
        // If you have any lines this long, I'm praying for your entire
        // family
        const buf = Buffer.alloc(1024);
        let size = 0;
        let lines = 1;
        let err: Error|null = null;

        const endPromise = new Promise<void>(resolve => {
            fp.on('end', resolve);
        });

        fp.on('data', recvBuf => {
            if (err) {
                return;
            }

            let start = 0;
            for (let i = 0; i < recvBuf.length; i++) {
                // hooray! we have a newline so this is a whole line.
                // let's copy it to the buffer so we can decode it
                if (recvBuf[i] === '\n'.charCodeAt(0)) {
                    const totalLen = size + i - start + 1;
                    if (totalLen > buf.length) {
                        err = new Error(`line of ${totalLen} bytes exceeds ` +
                                        `maximum length of ${buf.length} on ` +
                                        `line ${lines}`);
                        return;
                    }

                    recvBuf.copy(buf, size, start, i + 1);

                    try {
                        this.parseLine(buf.slice(0, totalLen).toString(),
                                       lines, symbols);
                    } catch (e) {
                        err = e;
                        return;
                    }

                    // Empty buffer
                    size = 0;
                    start = i + 1;
                    lines++;
                }
            }

            // Copy excess
            if (start < recvBuf.length) {
                const totalLen = size + recvBuf.length - start;

                if (totalLen > buf.length) {
                    err = new Error(`line of >=${totalLen} bytes exceeds ` +
                                    `maximum length of ${buf.length} on ` +
                                    `line ${lines}`);
                }
                recvBuf.copy(buf, 0, start, recvBuf.length);
                size = totalLen;
            }
        });

        await endPromise;

        if (err) {
            throw err;
        }

        if (size > 0) {
            this.parseLine(buf.slice(0, size).toString(), lines, symbols);
            size = 0;
        }
    }

    private parseLine(line: string, lines: number, symbols: Symbols) {
        line = line.trim();

        // Ignore empty lines
        if (!line) {
            return;
        }

        const splat = line.split('\t');

        if (splat.length !== 2) {
            throw new Error(`found ${splat.length - 1} tabs instead of 1 ` +
                            `on line ${lines}`);
        }

        const [hexAddr, sym] = splat;
        const addr = parseInt(hexAddr, 16);

        if (addr < 0) {
            throw new Error(`negative address \`${hexAddr}' on line ${lines}`);
        }

        if (isNaN(addr)) {
            throw new Error(`invalid address \`${hexAddr}' on line ${lines}`);
        }

        if (symbols.hasSymbol(sym)) {
            throw new Error(`duplicate symbol \`${sym}' on line ${lines}`);
        }

        symbols.setSymbol(sym, addr);
    }
}

export { ComplxObjectFileLoader };
