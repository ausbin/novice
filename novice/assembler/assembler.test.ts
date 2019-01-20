import { Buffer } from 'buffer';
import { Writable, Readable } from 'stream';
import { getConfig, Assembler } from '.';

describe('assembler', () => {
    let fp: Readable;
    let assembler: Assembler;

    beforeEach(() => {
        fp = new Readable();
    });

    describe('lc-3', () => {
        beforeEach(() => {
            // Test the complx parser and lc3 isa for now
            assembler = new Assembler(getConfig('lc3'));
        });

        describe('parse(fp)', () => {
            it('parses trivial program', () => {
                fp.push('.orig x3000\n')
                fp.push('halt\n')
                fp.push('.end\n')
                fp.push(null)

                return expect(assembler.parse(fp)).resolves.toEqual({
                    sections: [
                        {startAddr: 0x3000, instructions: [
                            {kind: 'instr', line: 2, op: 'halt', operands: []},
                        ]},
                    ],
                    labels: {},
                });
            });

            it('parses label on its own line', () => {
                fp.push('.orig x3000\n')
                fp.push('fun\n')
                fp.push('br fun\n')
                fp.push('.end\n')
                fp.push(null)

                return expect(assembler.parse(fp)).resolves.toEqual({
                    sections: [
                        {startAddr: 0x3000, instructions: [
                            {kind: 'instr', line: 3, op: 'br', operands: [
                                {kind: 'label', label: 'fun'}
                            ]},
                        ]},
                    ],
                    labels: {'fun': [0, 0]},
                });
            });

            it('parses hello world program', () => {
                fp.push('.orig x3000\n')
                fp.push('lea r0, mystring\n')
                fp.push('puts\n')
                fp.push('halt\n')
                fp.push('\n');
                fp.push('\n');
                fp.push('mystring .stringz "hello world!"\n')
                fp.push('.end\n')
                fp.push(null)

                return expect(assembler.parse(fp)).resolves.toEqual({
                    sections: [
                        {startAddr: 0x3000, instructions: [
                            {kind: 'instr', line: 2, op: 'lea', operands: [
                                {kind: 'reg',   prefix: 'r', num: 0},
                                {kind: 'label', label: 'mystring'},
                            ]},
                            {kind: 'instr', line: 3, op: 'puts', operands: []},
                            {kind: 'instr', line: 4, op: 'halt', operands: []},
                            {kind: 'pseudoop', line: 7, op: 'stringz', operand:
                                {kind: 'string', contents: "hello world!"},
                            },
                        ]},
                    ],
                    labels: {
                        'mystring': [0, 3]
                    },
                });
            });

            it('parses multiple sections', () => {
                fp.push('.orig x3000\n')
                fp.push('haltme halt\n')
                fp.push('.end\n')
                fp.push('\n')
                fp.push('.orig x4000\n')
                fp.push('and r0, r0, -3\n')
                fp.push('halt2 halt\n')
                fp.push('.end\n')
                fp.push(null)

                return expect(assembler.parse(fp)).resolves.toEqual({
                    sections: [
                        {startAddr: 0x3000, instructions: [
                            {kind: 'instr', line: 2, op: 'halt', operands: []},
                        ]},
                        {startAddr: 0x4000, instructions: [
                            {kind: 'instr', line: 6, op: 'and', operands: [
                                {kind: 'reg', prefix: 'r', num: 0},
                                {kind: 'reg', prefix: 'r', num: 0},
                                {kind: 'int', val: -3},
                            ]},
                            {kind: 'instr', line: 7, op: 'halt', operands: []},
                        ]},
                    ],
                    labels: {
                        'haltme': [0, 0],
                        'halt2':  [1, 1],
                    },
                });
            });

            it('preserves label case', () => {
                fp.push('.orig x3000\n')
                fp.push('mYlAbeL halt\n')
                fp.push('another-label .blkw 1\n')
                fp.push('LOUD_LABEL .blkw 1\n')
                fp.push('.end\n')
                fp.push(null)

                return expect(assembler.parse(fp)).resolves.toEqual({
                    sections: [
                        {startAddr: 0x3000, instructions: [
                            {kind: 'instr', line: 2, op: 'halt', operands: []},
                            {kind: 'pseudoop', line: 3, op: 'blkw', operand:
                                {kind: 'int', val: 1}},
                            {kind: 'pseudoop', line: 4, op: 'blkw', operand:
                                {kind: 'int', val: 1}},
                        ]},
                    ],
                    labels: {
                        'mYlAbeL':       [0, 0],
                        'another-label': [0, 1],
                        'LOUD_LABEL':    [0, 2],
                    },
                });
            });

            it('understands string escapes', () => {
                fp.push('.orig x3000\n')
                fp.push(".fill '\\n'\n")
                fp.push(".fill '\\r'\n")
                fp.push(".fill '\\t'\n")
                fp.push(".fill '\\\\'\n")
                fp.push(".fill '\\''\n")
                fp.push(".fill '\a'\n")
                fp.push('.end\n')
                fp.push(null)

                return expect(assembler.parse(fp)).resolves.toEqual({
                    sections: [
                        {startAddr: 0x3000, instructions: [
                            {kind: 'pseudoop', line: 2, op: 'fill', operand:
                                {kind: 'int', val: '\n'.charCodeAt(0)}},
                            {kind: 'pseudoop', line: 3, op: 'fill', operand:
                                {kind: 'int', val: '\r'.charCodeAt(0)}},
                            {kind: 'pseudoop', line: 4, op: 'fill', operand:
                                {kind: 'int', val: '\t'.charCodeAt(0)}},
                            {kind: 'pseudoop', line: 5, op: 'fill', operand:
                                {kind: 'int', val: '\\'.charCodeAt(0)}},
                            {kind: 'pseudoop', line: 6, op: 'fill', operand:
                                {kind: 'int', val: '\''.charCodeAt(0)}},
                            {kind: 'pseudoop', line: 7, op: 'fill', operand:
                                {kind: 'int', val: 'a'.charCodeAt(0)}},
                        ]},
                    ],
                    labels: {},
                });
            });

            it('errors on duplicate labels', () => {
                fp.push('.orig x3000\n')
                fp.push('mylabel .blkw 1\n')
                fp.push('mylabel .blkw 1\n')
                fp.push('.end\n')
                fp.push(null)

                return expect(assembler.parse(fp)).rejects.toThrow(
                    'duplicate label mylabel on line 3');
            });

            it('errors on missing .end', () => {
                fp.push('.orig x3000\n')
                fp.push('halt\n')
                fp.push(null)

                return expect(assembler.parse(fp)).rejects.toThrow('missing an .end');
            });

            it('errors on .end label', () => {
                fp.push('.orig x3000\n')
                fp.push('halt\n')
                fp.push('duh .end\n')
                fp.push(null)

                return expect(assembler.parse(fp)).rejects.toThrow('should not have a label');
            });

            it('errors on .end with operand', () => {
                fp.push('.orig x3000\n')
                fp.push('halt\n')
                fp.push('.end "ho ho"\n')
                fp.push(null)

                return expect(assembler.parse(fp)).rejects.toThrow('should not have an operand');
            });

            it('errors on .orig label', () => {
                fp.push('duhhhh .orig x3000\n')
                fp.push('halt\n')
                fp.push('.end\n')
                fp.push(null)

                return expect(assembler.parse(fp)).rejects.toThrow('should not have a label');
            });

            it('errors on .orig without operand', () => {
                fp.push('.orig\n')
                fp.push('halt\n')
                fp.push('.end\n')
                fp.push(null)

                return expect(assembler.parse(fp)).rejects.toThrow('needs an address operand');
            });

            it('errors on .orig with wrong operand type', () => {
                fp.push('.orig "duhhhh"\n')
                fp.push('halt\n')
                fp.push('.end\n')
                fp.push(null)

                return expect(assembler.parse(fp)).rejects.toThrow('needs an address operand');
            });

            it('errors on stray pseudo-op', () => {
                fp.push('.blkw 1\n')
                fp.push(null)

                return expect(assembler.parse(fp)).rejects.toThrow('stray assembler directive');
            });

            it('errors on stray label', () => {
                fp.push('doh\n')
                fp.push(null)

                return expect(assembler.parse(fp)).rejects.toThrow('stray label');
            });

            it('errors on stray instruction', () => {
                fp.push('trap x420\n')
                fp.push(null)

                return expect(assembler.parse(fp)).rejects.toThrow('stray instruction');
            });

            it('errors on dangling operand', () => {
                fp.push('.orig x3000\n');
                fp.push('lea r0, mystring puts\n');
                fp.push('halt\n');
                fp.push('.end\n');
                fp.push(null);
                return expect(assembler.parse(fp)).rejects.toThrow('puts');
            });
        });

        describe('assemble(fp)', () => {
            it('assembles trivial program', () => {
                fp.push('.orig x3000\n')
                fp.push('halt\n')
                fp.push('.end\n')
                fp.push(null)

                return expect(assembler.assemble(fp)).resolves.toEqual([
                    {
                        startAddr: 0x3000,
                        words: [
                            0xf025,
                        ],
                    },
                ]);
            });

            it('assembles branch', () => {
                fp.push('.orig x3000\n')
                fp.push('fun\n')
                fp.push('br fun\n')
                fp.push('.end\n')
                fp.push(null)

                return expect(assembler.assemble(fp)).resolves.toEqual([
                    {
                        startAddr: 0x3000,
                        words: [
                            0b0000111111111111,
                        ],
                    },
                ]);
            });

            it('assembles hello world program', () => {
                fp.push('.orig x3000\n')
                fp.push('lea r0, mystring\n')
                fp.push('puts\n')
                fp.push('halt\n')
                fp.push('\n');
                fp.push('\n');
                fp.push('mystring .stringz "hello world!"\n')
                fp.push('.end\n')
                fp.push(null)

                return expect(assembler.assemble(fp)).resolves.toEqual([
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
                ]);
            });

            it('assembles multiple sections', () => {
                fp.push('.orig x3000\n')
                fp.push('haltme halt\n')
                fp.push('.end\n')
                fp.push('\n')
                fp.push('.orig x4000\n')
                fp.push('and r1, r2, -3\n')
                fp.push('halt2 halt\n')
                fp.push('.end\n')
                fp.push(null)

                return expect(assembler.assemble(fp)).resolves.toEqual([
                    {
                        startAddr: 0x3000,
                        words: [
                            0xf025,
                        ],
                    },
                    {
                        startAddr: 0x4000,
                        words: [
                            0b0101001010111101,
                            0xf025,
                        ],
                    },
                ]);
            });

            it('assembles arithmetic instructions', () => {
                fp.push('.orig x3000\n')
                fp.push('add r4, r5, r3\n')
                fp.push('add r4, r5, 3\n')
                fp.push('and r6, r3, r2\n')
                fp.push('and r6, r3, 2\n')
                fp.push('asdf not r3, r4\n')
                fp.push('.end\n')
                fp.push(null)

                return expect(assembler.assemble(fp)).resolves.toEqual([
                    {
                        startAddr: 0x3000,
                        words: [
                            0b0001100101000011,
                            0b0001100101100011,
                            0b0101110011000010,
                            0b0101110011100010,
                            0b1001011100111111,
                        ],
                    },
                ]);
            });

            it('assembles branch instructions', () => {
                fp.push('.orig x3000\n')
                fp.push('nop\n')
                fp.push('\n')
                fp.push('asdf0 brp   asdf0\n')
                fp.push('asdf1 brz   asdf1\n')
                fp.push('asdf2 brzp  asdf2\n')
                fp.push('asdf3 brn   asdf3\n')
                fp.push('asdf4 brnp  asdf4\n')
                fp.push('asdf5 brnz  asdf5\n')
                fp.push('asdf6 brnzp asdf6\n')
                fp.push('asdf7 br    asdf7\n')
                fp.push('\n')
                fp.push('subr jmp r3\n')
                fp.push('jsr subr\n')
                fp.push('jsrr r5\n')
                fp.push('ret\n')
                fp.push('\n')
                fp.push('trap x69\n')
                fp.push('.end\n')
                fp.push(null)

                return expect(assembler.assemble(fp)).resolves.toEqual([
                    {
                        startAddr: 0x3000,
                        words: [
                            // nop
                            0b0000000000000000,

                            // br
                            0b0000001111111111,
                            0b0000010111111111,
                            0b0000011111111111,
                            0b0000100111111111,
                            0b0000101111111111,
                            0b0000110111111111,
                            0b0000111111111111,
                            0b0000111111111111,

                            // jmp/jsr/ret
                            0b1100000011000000,
                            0b0100111111111110,
                            0b0100000101000000,
                            0b1100000111000000,

                            // trap
                            0b1111000001101001,
                        ],
                    },
                ]);
            });

            it('assembles memory instructions', () => {
                fp.push('.orig x3000\n')
                fp.push('asdf0 ld  r3, asdf0\n')
                fp.push('asdf1 ldi r4, asdf1\n')
                fp.push('asdf2 lea r2, asdf2\n')
                fp.push('ldr r1, r5, -4\n')
                fp.push('\n')
                fp.push('asdf3 st  r3, asdf3\n')
                fp.push('asdf4 sti r4, asdf4\n')
                fp.push('str r1, r5, -4\n')
                fp.push('.end\n')
                fp.push(null)

                return expect(assembler.assemble(fp)).resolves.toEqual([
                    {
                        startAddr: 0x3000,
                        words: [
                            // loads
                            0b0010011111111111,
                            0b1010100111111111,
                            0b1110010111111111,
                            0b0110001101111100,

                            // stores
                            0b0011011111111111,
                            0b1011100111111111,
                            0b0111001101111100,
                        ],
                    },
                ]);
            });

            it('assembles trap aliases', () => {
                fp.push('.orig x3000\n')
                fp.push('getc\n');
                fp.push('out\n');
                fp.push('puts\n');
                fp.push('in\n');
                fp.push('halt\n');
                fp.push('.end\n')
                fp.push(null)

                return expect(assembler.assemble(fp)).resolves.toEqual([
                    {
                        startAddr: 0x3000,
                        words: [
                            0xf020,
                            0xf021,
                            0xf022,
                            0xf023,
                            0xf025,
                        ],
                    },
                ]);
            });

            it('assembles pseudo-ops', () => {
                fp.push('.orig x5000\n')
                fp.push('.blkw 3\n');
                fp.push('.fill x1337\n');
                fp.push('.blkw 1\n');
                fp.push('.fill -2\n');
                fp.push('label .fill label\n');
                fp.push('.stringz ""\n');
                fp.push('.stringz "hi"\n');
                fp.push('.end\n')
                fp.push(null)

                return expect(assembler.assemble(fp)).resolves.toEqual([
                    {
                        startAddr: 0x5000,
                        words: [
                            0x0,
                            0x0,
                            0x0,
                            0x1337,
                            0x0,
                            0xfffe,
                            0x5006,
                            0x0,
                            'h'.charCodeAt(0),
                            'i'.charCodeAt(0),
                            0x0,
                        ],
                    },
                ]);
            });

            it('errors on nonexistent label', () => {
                fp.push('.orig x3000\n');
                fp.push('lea r0, mystringputs\n');
                fp.push('halt\n');
                fp.push('.end\n');
                fp.push(null);

                return expect(assembler.assemble(fp)).rejects.toThrow('mystringputs');
            });

            it('errors on undersized immediate', () => {
                fp.push('.orig x3000\n');
                fp.push('add r0, r0, -64\n');
                fp.push('.end\n');
                fp.push(null);

                return expect(assembler.assemble(fp)).rejects.toThrow('-64');
            });

            it('errors on barely undersized immediate', () => {
                fp.push('.orig x3000\n');
                fp.push('add r0, r0, -17\n');
                fp.push('.end\n');
                fp.push(null);

                return expect(assembler.assemble(fp)).rejects.toThrow('-17');
            });

            it('assembles almost undersized immediate', () => {
                fp.push('.orig x3000\n');
                fp.push('add r0, r0, -16\n');
                fp.push('.end\n');
                fp.push(null);

                return expect(assembler.assemble(fp)).resolves.toEqual([
                    {
                        startAddr: 0x3000,
                        words: [
                            0b0001000000110000,
                        ],
                    },
                ]);
            });

            it('errors on oversized immediate', () => {
                fp.push('.orig x3000\n');
                fp.push('add r0, r0, 64\n');
                fp.push('.end\n');
                fp.push(null);

                return expect(assembler.assemble(fp)).rejects.toThrow('64');
            });

            it('errors on barely oversized immediate', () => {
                fp.push('.orig x3000\n');
                fp.push('add r0, r0, 16\n');
                fp.push('.end\n');
                fp.push(null);

                return expect(assembler.assemble(fp)).rejects.toThrow('16');
            });

            it('assembles almost oversized immediate', () => {
                fp.push('.orig x3000\n');
                fp.push('add r0, r0, 15\n');
                fp.push('.end\n');
                fp.push(null);

                return expect(assembler.assemble(fp)).resolves.toEqual([
                    {
                        startAddr: 0x3000,
                        words: [
                            0b0001000000101111,
                        ],
                    },
                ]);
            });

            it('errors on oversized label offset', () => {
                fp.push('.orig x3000\n');
                fp.push('ld r3, faraway\n');
                fp.push('.blkw 1024\n');
                fp.push('faraway .fill 69\n');
                fp.push('.end\n');
                fp.push(null);

                return expect(assembler.assemble(fp)).rejects.toThrow('1024');
            });

            it('errors on barely oversized label offset', () => {
                fp.push('.orig x3000\n');
                fp.push('ld r3, faraway\n');
                fp.push('.blkw 256\n');
                fp.push('faraway .fill 69\n');
                fp.push('.end\n');
                fp.push(null);

                return expect(assembler.assemble(fp)).rejects.toThrow('256');
            });

            it('errors on undersized label offset', () => {
                fp.push('.orig x3000\n');
                fp.push('faraway .fill 69\n');
                fp.push('.blkw 1024\n');
                fp.push('ld r3, faraway\n');
                fp.push('.end\n');
                fp.push(null);

                return expect(assembler.assemble(fp)).rejects.toThrow('-1026');
            });

            it('errors on barely oversized label offset', () => {
                fp.push('.orig x3000\n');
                fp.push('faraway .fill 69\n');
                fp.push('.blkw 255\n');
                fp.push('ld r3, faraway\n');
                fp.push('.end\n');
                fp.push(null);

                return expect(assembler.assemble(fp)).rejects.toThrow('-257');
            });

            it('assembles non-overlapping sections', () => {
                fp.push('.orig x4001\n');
                fp.push('.blkw 1\n');
                fp.push('.end\n');
                fp.push('.orig x4000\n');
                fp.push('.blkw 1\n');
                fp.push('.end\n');
                fp.push(null);

                return expect(assembler.assemble(fp)).resolves.toEqual([
                    {
                        startAddr: 0x4001,
                        words: [
                            0x0,
                        ],
                    },
                    {
                        startAddr: 0x4000,
                        words: [
                            0x0,
                        ],
                    },
                ]);
            });

            it('errors on overlapping sections', () => {
                fp.push('.orig x4001\n');
                fp.push('.blkw 1\n');
                fp.push('.end\n');
                fp.push('.orig x4000\n');
                fp.push('.blkw 2\n');
                fp.push('.end\n');
                fp.push(null);

                return expect(assembler.assemble(fp)).rejects.toThrow('overlap');
            });

            it('errors on bogus pseudoops with no operands', () => {
                fp.push('.orig x3000\n');
                fp.push('.bob\n');
                fp.push('.end\n');
                fp.push(null);

                return expect(assembler.assemble(fp)).rejects
                       .toThrow('.bob with no operand');
            });

            it('errors on bogus pseudoops with operand', () => {
                fp.push('.orig x3000\n');
                fp.push('.bob "hey ya"\n');
                fp.push('.end\n');
                fp.push(null);

                return expect(assembler.assemble(fp)).rejects
                       .toThrow('.bob with string operand');
            });

            it('errors on bogus instructions', () => {
                fp.push('.orig x3000\n');
                fp.push('steveo r1, r3, r3\n');
                fp.push('.end\n');
                fp.push(null);

                return expect(assembler.assemble(fp)).rejects
                       .toThrow('steveo with operands reg, reg, reg');
            });

            it('errors on barely oversized regnos', () => {
                fp.push('.orig x3000\n');
                fp.push('add r0, r0, r8\n');
                fp.push('.end\n');
                fp.push(null);

                return expect(assembler.assemble(fp)).rejects
                       .toThrow(/8 .* on line 2/i);
            });

            it('errors on oversized regnos', () => {
                fp.push('.orig x3000\n');
                fp.push('add r0, r0, r1000\n');
                fp.push('.end\n');
                fp.push(null);

                return expect(assembler.assemble(fp)).rejects
                       .toThrow(/1000 .* on line 2/i);
            });

            it('errors on barely negative non-sign-extended immediates', () => {
                fp.push('.orig x3000\n');
                fp.push('trap -1\n');
                fp.push('.end\n');
                fp.push(null);

                return expect(assembler.assemble(fp)).rejects
                       .toThrow('-1');
            });

            it('errors on negative non-sign-extended immediates', () => {
                fp.push('.orig x3000\n');
                fp.push('trap -1000\n');
                fp.push('.end\n');
                fp.push(null);

                return expect(assembler.assemble(fp)).rejects
                       .toThrow('-1000');
            });

            it('errors on barely oversized non-sign-extended immediates', () => {
                fp.push('.orig x3000\n');
                fp.push('trap 256\n');
                fp.push('.end\n');
                fp.push(null);

                return expect(assembler.assemble(fp)).rejects
                       .toThrow('256');
            });

            it('errors on oversized non-sign-extended immediates', () => {
                fp.push('.orig x3000\n');
                fp.push('trap 1000\n');
                fp.push('.end\n');
                fp.push(null);

                return expect(assembler.assemble(fp)).rejects
                       .toThrow('1000');
            });

            it('errors on too many operands', () => {
                fp.push('.orig x3000\n');
                fp.push('add r0, r0, 3, r0\n');
                fp.push('.end\n');
                fp.push(null);

                return expect(assembler.assemble(fp)).rejects
                       .toThrow('reg, reg, int, reg');
            });

            it('errors on too few operands', () => {
                fp.push('.orig x3000\n');
                fp.push('add r0, r0\n');
                fp.push('.end\n');
                fp.push(null);

                return expect(assembler.assemble(fp)).rejects
                       .toThrow('reg, reg');
            });
        });

        describe('assembleTo(inFp, outFp)', () => {
            let outFp: Writable;
            let outActual: Buffer;
            let outActualLen: number;

            beforeEach(() => {
                outActualLen = 0;
                outActual = Buffer.alloc(1024);
                outFp = new Writable({
                    write(arr, encoding, callback) {
                        for (let i = 0; i < arr.length; i++) {
                            if (outActualLen === outActual.length) {
                                throw new Error('object file too big');
                            }

                            outActual[outActualLen++] = arr[i];
                        }
                        callback();
                    },
                });
            });

            it('generates object file for minimal program', () => {
                fp.push('.orig x3000\n');
                fp.push('halt\n');
                fp.push('.end\n');
                fp.push(null);

                return assembler.assembleTo(fp, outFp).then(() => {
                    let exp = new Uint8Array([
                        0x30,0x00,
                        0x00,0x01,
                        0xf0,0x25,
                    ]);
                    expect(outActualLen).toEqual(exp.length);
                    expect(outActual.slice(0, outActualLen).equals(exp)).toBe(true);
                });
            });

            it('generates object file for hello world', () => {
                fp.push('.orig x3000\n')
                fp.push('lea r0, mystring\n')
                fp.push('puts\n')
                fp.push('halt\n')
                fp.push('\n');
                fp.push('\n');
                fp.push('mystring .stringz "hello world!"\n')
                fp.push('.end\n')
                fp.push(null)

                return assembler.assembleTo(fp, outFp).then(() => {
                    let exp = new Uint8Array([
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
                    expect(outActualLen).toEqual(exp.length);
                    expect(outActual.slice(0, outActualLen).equals(exp)).toBe(true);
                });
            });

            it('generates object file for multiple sections', () => {
                fp.push('.orig x8000\n');
                fp.push('lea r0, hi\n');
                fp.push('puts\n');
                fp.push('halt\n');
                fp.push('hi .fill \'h\'\n');
                fp.push('.fill \'i\'\n');
                fp.push('.fill 0\n');
                fp.push('.end\n');
                fp.push('.orig x3000\n');
                fp.push('halt\n');
                fp.push('.end\n');
                fp.push('.orig x5000\n');
                fp.push('and r0, r0, 0\n');
                fp.push('add r0, r0, 1\n');
                fp.push('halt\n');
                fp.push('.end\n');
                fp.push(null);

                return assembler.assembleTo(fp, outFp).then(() => {
                    let exp = new Uint8Array([
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
                    expect(outActualLen).toEqual(exp.length);
                    expect(outActual.slice(0, outActualLen).equals(exp)).toBe(true);
                });
            });
        });
    });

    describe('lc-2200', () => {
        beforeEach(() => {
            assembler = new Assembler(getConfig('lc2200'));
        });

        describe('parse(fp)', () => {
            it('parses trivial program', () => {
                fp.push('halt\n')
                fp.push(null)

                return expect(assembler.parse(fp)).resolves.toEqual({
                    sections: [
                        {startAddr: 0, instructions: [
                            {kind: 'instr', line: 1, op: 'halt', operands: []},
                        ]},
                    ],
                    labels: {},
                });
            });

            it('parses label on its own line', () => {
                fp.push('fun:\n')
                fp.push('beq $zero, $zero, fun\n')
                fp.push(null)

                return expect(assembler.parse(fp)).resolves.toEqual({
                    sections: [
                        {startAddr: 0, instructions: [
                            {kind: 'instr', line: 2, op: 'beq', operands: [
                                {kind: 'reg', prefix: '$', num: 0},
                                {kind: 'reg', prefix: '$', num: 0},
                                {kind: 'label', label: 'fun'},
                            ]},
                        ]},
                    ],
                    labels: {'fun': [0, 0]},
                });
            });

            it('preserves label case', () => {
                fp.push('mYlAbeL: halt\n')
                fp.push('another-label: halt\n')
                fp.push('LOUD_LABEL: halt\n')
                fp.push(null)

                return expect(assembler.parse(fp)).resolves.toEqual({
                    sections: [
                        {startAddr: 0, instructions: [
                            {kind: 'instr', line: 1, op: 'halt', operands: []},
                            {kind: 'instr', line: 2, op: 'halt', operands: []},
                            {kind: 'instr', line: 3, op: 'halt', operands: []},
                        ]},
                    ],
                    labels: {
                        'mYlAbeL':       [0, 0],
                        'another-label': [0, 1],
                        'LOUD_LABEL':    [0, 2],
                    },
                });
            });

            it('errors on duplicate labels', () => {
                fp.push('mylabel: .word 0\n')
                fp.push('mylabel: .word 0\n')
                fp.push(null)

                return expect(assembler.parse(fp)).rejects.toThrow(
                    'duplicate label mylabel on line 2');
            });

            it('errors on stray label', () => {
                fp.push('doh:\n')
                fp.push(null)

                return expect(assembler.parse(fp)).rejects.toThrow('stray label');
            });

            it('errors on dangling operand', () => {
                fp.push('addi $zero, $zero, 34 halt\n');
                fp.push('halt\n');
                fp.push(null);
                return expect(assembler.parse(fp)).rejects.toThrow('halt');
            });
        });

        describe('assemble(fp)', () => {
            it('assembles trivial program', () => {
                fp.push('halt\n')
                fp.push(null)

                return expect(assembler.assemble(fp)).resolves.toEqual([
                    {
                        startAddr: 0x0,
                        words: [
                            0x70000000,
                        ],
                    },
                ]);
            });

            it('assembles branch', () => {
                fp.push('fun:\n')
                fp.push('beq $zero, $zero, fun\n')
                fp.push(null)

                return expect(assembler.assemble(fp)).resolves.toEqual([
                    {
                        startAddr: 0x0,
                        words: [
                            0x500fffff,
                        ],
                    },
                ]);
            });

            it('assembles arithmetic instructions', () => {
                fp.push('nop\n')
                fp.push('add $t0, $s0, $a0\n')
                fp.push('addi $s2, $t1, 37\n')
                fp.push('asdf: nand $v0, $s1, $at\n')
                fp.push(null)

                return expect(assembler.assemble(fp)).resolves.toEqual([
                    {
                        startAddr: 0x0,
                        words: [
                            0x00000000,
                            0x06900003,
                            0x2b700025,
                            0x12a00001,
                        ],
                    },
                ]);
            });

            it('assembles branch instructions', () => {
                fp.push('asdf0: beq $v0, $t0, asdf0\n')
                fp.push('jalr $at, $ra\n')
                fp.push(null)

                return expect(assembler.assemble(fp)).resolves.toEqual([
                    {
                        startAddr: 0x0,
                        words: [
                            0x526fffff,
                            0x61f00000,
                        ],
                    },
                ]);
            });

            it('assembles memory instructions', () => {
                fp.push('lw $t0, 33($v0)\n')
                fp.push('sw $s0, -5($t2)\n')
                fp.push(null)

                return expect(assembler.assemble(fp)).resolves.toEqual([
                    {
                        startAddr: 0x0,
                        words: [
                            0x36200021,
                            0x498ffffb,
                        ],
                    },
                ]);
            });

            it('assembles pseudo-ops', () => {
                fp.push('.word 0xf0006969\n')
                fp.push('xd: .word -2\n');
                fp.push('.word 1056\n');
                fp.push('.word xd\n');
                fp.push(null)

                return expect(assembler.assemble(fp)).resolves.toEqual([
                    {
                        startAddr: 0x0,
                        words: [
                            // Sign extends
                            0xf0006969 & -1,
                            0xfffffffe & -1,
                            0x00000420,
                            0x00000001,
                        ],
                    },
                ]);
            });

            it('assembles la', () => {
                fp.push('la $t0, trevor\n');
                fp.push('.word 0\n');
                fp.push('.word 0\n');
                fp.push('.word 0\n');
                fp.push('.word 0\n');
                fp.push('trevor: .word 0x69\n');
                fp.push(null)

                return expect(assembler.assemble(fp)).resolves.toEqual([
                    {
                        startAddr: 0x0,
                        words: [
                            0x66600000,
                            0x26000005,
                            0x00000000,
                            0x00000000,
                            0x00000000,
                            0x00000000,
                            0x00000069,
                        ],
                    },
                ]);
            });

            it('errors on nonexistent label', () => {
                fp.push('beq $zero, $zero, daddy\n');
                fp.push('halt\n');
                fp.push(null);

                return expect(assembler.assemble(fp)).rejects.toThrow('daddy');
            });

            it('errors on nonexistent label with la', () => {
                fp.push('la $t0, daddy\n');
                fp.push('halt\n');
                fp.push(null);

                return expect(assembler.assemble(fp)).rejects.toThrow('daddy');
            });

            it('errors on undersized immediate', () => {
                fp.push('addi $zero, $zero, -1000000\n');
                fp.push(null);

                return expect(assembler.assemble(fp)).rejects.toThrow('-1000000');
            });

            it('errors on barely undersized immediate', () => {
                fp.push('addi $zero, $zero, -524289\n');
                fp.push(null);

                return expect(assembler.assemble(fp)).rejects.toThrow('-524289');
            });

            it('assembles almost undersized immediate', () => {
                fp.push('addi $zero, $zero, -524288\n');
                fp.push(null);

                return expect(assembler.assemble(fp)).resolves.toEqual([
                    {
                        startAddr: 0x0,
                        words: [
                            0x20080000,
                        ],
                    },
                ]);
            });

            it('errors on oversized immediate', () => {
                fp.push('addi $zero, $zero, 1000000\n');
                fp.push(null);

                return expect(assembler.assemble(fp)).rejects.toThrow('1000000');
            });

            it('errors on barely oversized immediate', () => {
                fp.push('addi $zero, $zero, 524288\n');
                fp.push(null);

                return expect(assembler.assemble(fp)).rejects.toThrow('524288');
            });

            it('assembles almost oversized immediate', () => {
                fp.push('addi $zero, $zero, 524287\n');
                fp.push(null);

                return expect(assembler.assemble(fp)).resolves.toEqual([
                    {
                        startAddr: 0x0,
                        words: [
                            0x2007ffff,
                        ],
                    },
                ]);
            });

            // TODO: figure out how to test label offset sizes without
            //       destroying jest

            it('errors on bogus pseudoops with no operands', () => {
                fp.push('.bob\n');
                fp.push(null);

                return expect(assembler.assemble(fp)).rejects
                       .toThrow('.bob with no operand');
            });

            it('errors on bogus pseudoops with operand', () => {
                fp.push('.bob 3\n');
                fp.push(null);

                return expect(assembler.assemble(fp)).rejects
                       .toThrow('.bob with int operand');
            });

            it('errors on bogus instructions without operands', () => {
                fp.push('water\n');
                fp.push(null);

                return expect(assembler.assemble(fp)).rejects
                       .toThrow('water with no operands');
            });

            it('errors on bogus instructions with operands', () => {
                fp.push('steveo $t0, $t1, $t2\n');
                fp.push(null);

                return expect(assembler.assemble(fp)).rejects
                       .toThrow('steveo with operands reg, reg, reg');
            });

            it('errors on barely oversized regnos', () => {
                fp.push('add $zero, $zero, $16\n');
                fp.push(null);

                return expect(assembler.assemble(fp)).rejects
                       .toThrow(/16 .* on line 1/i);
            });

            it('errors on oversized regnos', () => {
                fp.push('add $zero, $zero, $1000\n');
                fp.push(null);

                return expect(assembler.assemble(fp)).rejects
                       .toThrow(/1000 .* on line 1/i);
            });

            it('errors on bogus reg aliases', () => {
                fp.push('add $zero, $zero, $feces\n');
                fp.push(null);

                return expect(assembler.assemble(fp)).rejects.toThrow('feces');
            });

            it('errors on too many operands', () => {
                fp.push('add $0, $0, 3, $0\n');
                fp.push(null);

                return expect(assembler.assemble(fp)).rejects
                       .toThrow('reg, reg, int, reg');
            });

            it('errors on too few operands', () => {
                fp.push('add $0, $0\n');
                fp.push(null);

                return expect(assembler.assemble(fp)).rejects
                       .toThrow('reg, reg');
            });
        });
    });
});
