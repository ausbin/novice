import { Buffer } from 'buffer';
import { Readable, Writable } from 'stream';
import { IO } from 'novice';
import { StreamIO } from './stream-io';

describe('StreamIO', () => {
    let stdinFp: Readable, stdoutFp: Writable;
    let stdin: string, stdout: string;
    let streamIO: IO;

    beforeEach(() => {
        stdin = stdout = '';
        // @ts-ignore
        stdinFp = {
            read(n: number) {
                n = Math.min(n, stdin.length);
                if (!n) {
                    return null;
                } else {
                    const res = Buffer.from(stdin.slice(0, n));
                    stdin = stdin.slice(n);
                    return res;
                }
            }
        };
        // @ts-ignore
        stdoutFp = {
            // @ts-ignore
            write(arr: Uint8Array) {
                for (let i = 0; i < arr.length; i++)
                    stdout += String.fromCharCode(arr[i]);
            }
        };

        streamIO = new StreamIO(stdinFp, stdoutFp);
    });

    describe('getc()', () => {
        it('handles eof', () => {
            return expect(streamIO.getc()).rejects.toThrow('unexpected EOF');
        });

        it('reads char', () => {
            stdin = 'hi';
            return expect(streamIO.getc()).resolves.toEqual('h'.charCodeAt(0));
        });
    });

    describe('putc()', () => {
        it('writes char', () => {
            streamIO.putc('x'.charCodeAt(0));
            streamIO.putc('D'.charCodeAt(0));
            expect(stdout).toEqual('xD');
        });
    });
});
