import { getIsa, Isa, SymbTable, MachineCodeSection } from 'novice';
import { Serializer } from './serializer';
import { ComplxObjectFileSerializer } from './complx';
import { Writable } from 'stream';

describe('complx serializer', () => {
    let serializer: Serializer;

    beforeEach(() => {
        serializer = new ComplxObjectFileSerializer();
    });

    it('has the right obj file extension', () => {
        expect(serializer.fileExt()).toEqual('obj');
    });

    it('has the right sym file extension', () => {
        expect(serializer.symbFileExt()).toEqual('sym');
    });

    describe('programs', () => {
        interface Buf {
            buf: Uint8Array;
            len: number;
        }

        let outFp: Writable;
        let outBuf: Buf;
        let isa: Isa;
        let symbtable: SymbTable;
        let code: MachineCodeSection[];

        const encode = (s: string) => new Uint8Array(s.split('').map(c => c.charCodeAt(0)));

        function mockFp(): [Writable, Buf] {
            const buf: Buf = {len: 0, buf: new Uint8Array(1024)};
            const writable = new Writable({
                write(arr, encoding, callback) {
                    for (let i = 0; i < arr.length; i++) {
                        if (buf.len === buf.buf.length) {
                            throw new Error('object file too big');
                        }

                        buf.buf[buf.len++] = arr[i];
                    }
                    callback();
                },
            });
            return [writable, buf];
        }

        beforeEach(() => {
            [outFp, outBuf] = mockFp();
        });

        describe('lc-3', () => {
            beforeEach(() => {
                isa = getIsa('lc3');
            });

            describe('trivial program', () => {
                beforeEach(() => {
                    // .orig x3000
                    // halt
                    // .end
                    [symbtable, code] = [
                        {},
                        [
                            {
                                startAddr: 0x3000,
                                words: [
                                    0xf025,
                                ],
                            },
                        ]
                    ];
                });

                it('serialize()', () => {
                    const exp = new Uint8Array([
                        0x30,0x00,
                        0x00,0x01,
                        0xf0,0x25,
                    ]);
                    serializer.serialize(isa, code, outFp);
                    expect(outBuf.len).toEqual(exp.length);
                    expect(outBuf.buf.slice(0, outBuf.len)).toEqual(exp);
                });

                it('serializeSymb()', () => {
                    const exp = encode("");
                    serializer.serializeSymb(symbtable, outFp);
                    expect(outBuf.len).toEqual(exp.length);
                    expect(outBuf.buf.slice(0, outBuf.len)).toEqual(exp);
                });
            });

            describe('hello world program', () => {
                beforeEach(() => {
                    // .orig x3000
                    // lea r0, mystring
                    // puts
                    // halt
                    // mystring .stringz "hello world!"
                    // .end
                    [symbtable, code] = [
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
                    ];
                });

                it('serialize()', () => {
                    const exp = new Uint8Array([
                        0x30,0x00,
                        0x00,0x10,
                        0xe0,0x02,
                        0xf0,0x22,
                        0xf0,0x25,
                        0x00,'h'.charCodeAt(0),
                        0x00,'e'.charCodeAt(0),
                        0x00,'l'.charCodeAt(0),
                        0x00,'l'.charCodeAt(0),
                        0x00,'o'.charCodeAt(0),
                        0x00,' '.charCodeAt(0),
                        0x00,'w'.charCodeAt(0),
                        0x00,'o'.charCodeAt(0),
                        0x00,'r'.charCodeAt(0),
                        0x00,'l'.charCodeAt(0),
                        0x00,'d'.charCodeAt(0),
                        0x00,'!'.charCodeAt(0),
                        0x00,0x00,
                    ]);
                    serializer.serialize(isa, code, outFp);
                    expect(outBuf.len).toEqual(exp.length);
                    expect(outBuf.buf.slice(0, outBuf.len)).toEqual(exp);
                });

                it('serializeSymb()', () => {
                    const exp = encode("3003\tmystring\n");
                    serializer.serializeSymb(symbtable, outFp);
                    expect(outBuf.len).toEqual(exp.length);
                    expect(outBuf.buf.slice(0, outBuf.len)).toEqual(exp);
                });
            });

            describe('multiple labels, sections', () => {
                beforeEach(() => {
                    // .orig x8000
                    // lea r0, hi
                    // puts
                    // halt
                    // hi .fill 'h'
                    // .fill 'i'
                    // .fill 0
                    // .end
                    //
                    // .orig x3000
                    // dinkleberg halt
                    // .end
                    //
                    // .orig x5000
                    // and r0, r0, 0
                    // tuba add r0, r0, 1
                    // halt
                    // .end
                    [symbtable, code] = [
                        {
                            hi: 0x8003,
                            dinkleberg: 0x3000,
                            tuba: 0x5001,
                        },
                        [
                            {
                                startAddr: 0x8000,
                                words: [
                                    0b1110000000000010,
                                    0xf022,
                                    0xf025,
                                    'h'.charCodeAt(0),
                                    'i'.charCodeAt(0),
                                    0,
                                ],
                            },
                            {
                                startAddr: 0x3000,
                                words: [
                                    0xf025,
                                ],
                            },
                            {
                                startAddr: 0x5000,
                                words: [
                                    0b0101000000100000,
                                    0b0001000000100001,
                                    0xf025,
                                ],
                            },
                        ]
                    ];
                });

                it('serialize()', () => {
                    const exp = new Uint8Array([
                        0x80,0x00,
                        0x00,0x06,
                        0xe0,0x02,
                        0xf0,0x22,
                        0xf0,0x25,
                        0x00,'h'.charCodeAt(0),
                        0x00,'i'.charCodeAt(0),
                        0x00,0x00,

                        0x30,0x00,
                        0x00,0x01,
                        0xf0,0x25,

                        0x50,0x00,
                        0x00,0x03,
                        0x50,0x20,
                        0x10,0x21,
                        0xf0,0x25,
                    ]);
                    serializer.serialize(isa, code, outFp);
                    expect(outBuf.len).toEqual(exp.length);
                    expect(outBuf.buf.slice(0, outBuf.len)).toEqual(exp);
                });

                it('serializeSymb()', () => {
                    const exp = encode("3000\tdinkleberg\n" +
                                       "5001\ttuba\n" +
                                       "8003\thi\n");
                    serializer.serializeSymb(symbtable, outFp);
                    expect(outBuf.len).toEqual(exp.length);
                    expect(outBuf.buf.slice(0, outBuf.len)).toEqual(exp);
                });
            });
        });
    });
});
