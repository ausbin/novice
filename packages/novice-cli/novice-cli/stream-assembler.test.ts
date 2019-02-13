import { Readable } from 'stream';
import { getConfig } from 'novice';
import { StreamAssembler } from './stream-assembler';

describe('stream assembler', () => {
    let fp: Readable;
    let assembler: StreamAssembler;

    beforeEach(() => {
        fp = new Readable();
    });

    describe('lc-3', () => {
        beforeEach(() => {
            assembler = new StreamAssembler(getConfig('lc3'));
        });

        it('assembles hello world program', () => {
            fp.push('.orig x3000\n');
            fp.push('lea r0, mystring\n');
            fp.push('puts\n');
            fp.push('halt\n');
            fp.push('\n');
            fp.push('\n');
            fp.push('mystring .stringz "hello world!"\n');
            fp.push('.end\n');
            fp.push(null);

            return assembler.assemble(fp).then(asm => {
                expect(asm).toEqual([
                    {
                        mystring: 0x3003,
                    },
                    [
                        {
                            startAddr: 0x3000,
                            words: [
                                0b1110000000000010,
                                0xf022,
                                0xf025,
                                'h'.charCodeAt(0),
                                'e'.charCodeAt(0),
                                'l'.charCodeAt(0),
                                'l'.charCodeAt(0),
                                'o'.charCodeAt(0),
                                ' '.charCodeAt(0),
                                'w'.charCodeAt(0),
                                'o'.charCodeAt(0),
                                'r'.charCodeAt(0),
                                'l'.charCodeAt(0),
                                'd'.charCodeAt(0),
                                '!'.charCodeAt(0),
                                0,
                            ],
                        },
                    ],
                ]);
            });
        });

        it('assembles with readable in decode mode', () => {
            fp = new Readable({encoding: 'utf-8'});

            fp.push('.orig x3000\n');
            fp.push('yeehaw halt\n');
            fp.push('.end\n');
            fp.push(null);

            return assembler.assemble(fp).then(asm => {
                expect(asm).toEqual([
                    {
                        yeehaw: 0x3000,
                    },
                    [
                        {
                            startAddr: 0x3000,
                            words: [
                                0xf025,
                            ],
                        },
                    ],
                ]);
            });
        });

        it('handles errors thrown by feedChars()', () => {
            fp.push('.orig x3000\n');
            fp.push('halt\n');
            fp.push('^ yeehaw\n');
            fp.push('.end\n');
            fp.push(null);

            return expect(assembler.assemble(fp)).rejects.toThrow('^');
        });
    });
});
