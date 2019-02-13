import { getConfig, Assembler } from '.';

describe('assembler', () => {
    let input: string;
    let assembler: Assembler;

    describe('lc-3', () => {
        beforeEach(() => {
            // Test the complx parser and lc3 isa for now
            assembler = new Assembler(getConfig('lc3'));
        });

        describe('parse(fp)', () => {
            it('parses trivial program', () => {
                input = '.orig x3000\n' +
                        'halt\n' +
                        '.end\n';

                expect(assembler.parseString(input)).toEqual({
                    sections: [
                        {startAddr: 0x3000, instructions: [
                            {kind: 'instr', line: 2, op: 'halt', operands: []},
                        ]},
                    ],
                    labels: {},
                });
            });

            it('parses label on its own line', () => {
                input = '.orig x3000\n' +
                        'fun\n' +
                        'br fun\n' +
                        '.end\n';

                expect(assembler.parseString(input)).toEqual({
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
                input = '.orig x3000\n' +
                        'lea r0, mystring\n' +
                        'puts\n' +
                        'halt\n' +
                        '\n' +
                        '\n' +
                        'mystring .stringz "hello world!"\n' +
                        '.end\n';

                expect(assembler.parseString(input)).toEqual({
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
                input = '.orig x3000\n' +
                        'haltme halt\n' +
                        '.end\n' +
                        '\n' +
                        '.orig x4000\n' +
                        'and r0, r0, -3\n' +
                        'halt2 halt\n' +
                        '.end\n';

                expect(assembler.parseString(input)).toEqual({
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
                input = '.orig x3000\n' +
                        'mYlAbeL halt\n' +
                        'another-label .blkw 1\n' +
                        'LOUD_LABEL .blkw 1\n' +
                        '.end\n';

                expect(assembler.parseString(input)).toEqual({
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
                input = '.orig x3000\n' +
                        ".fill '\\n'\n" +
                        ".fill '\\r'\n" +
                        ".fill '\\t'\n" +
                        ".fill '\\\\'\n" +
                        ".fill '\\''\n" +
                        ".fill '\a'\n" +
                        '.end\n';

                expect(assembler.parseString(input)).toEqual({
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

            it('understands annoying # before int operands', () => {
                input = '.orig x3000\n' +
                        'add r0, r0, #xa\n' +
                        'add r0, r0, #3\n' +
                        '.fill #xbeef\n' +
                        '.fill #4\n' +
                        '.end\n';

                expect(assembler.parseString(input)).toEqual({
                    sections: [
                        {startAddr: 0x3000, instructions: [
                            {kind: 'instr', line: 2, op: 'add', operands: [
                                {kind: 'reg', prefix: 'r', num: 0},
                                {kind: 'reg', prefix: 'r', num: 0},
                                {kind: 'int', val: 10},
                            ]},
                            {kind: 'instr', line: 3, op: 'add', operands: [
                                {kind: 'reg', prefix: 'r', num: 0},
                                {kind: 'reg', prefix: 'r', num: 0},
                                {kind: 'int', val: 3},
                            ]},
                            {kind: 'pseudoop', line: 4, op: 'fill', operand:
                                {kind: 'int', val: 0xbeef}},
                            {kind: 'pseudoop', line: 5, op: 'fill', operand:
                                {kind: 'int', val: 4}},
                        ]},
                    ],
                    labels: {},
                });
            });

            it('lowercases screaming code', () => {
                input = '.orig x3000\n' +
                        'ADD R3, R2, #8\n' +
                        'HALT\n' +
                        '.FILL 8\n' +
                        '.end\n';

                expect(assembler.parseString(input)).toEqual({
                    sections: [
                        {startAddr: 0x3000, instructions: [
                            {kind: 'instr', line: 2, op: 'add', operands: [
                                {kind: 'reg', prefix: 'r', num: 3},
                                {kind: 'reg', prefix: 'r', num: 2},
                                {kind: 'int', val: 8},
                            ]},
                            {kind: 'instr', line: 3, op: 'halt', operands: []},
                            {kind: 'pseudoop', line: 4, op: 'fill', operand:
                                {kind: 'int', val: 8}},
                        ]},
                    ],
                    labels: {},
                });
            });

            it('errors on duplicate labels', () => {
                input = '.orig x3000\n' +
                        'mylabel .blkw 1\n' +
                        'mylabel .blkw 1\n' +
                        '.end\n';

                expect(() => {
                    assembler.parseString(input)
                }).toThrow('duplicate label mylabel on line 3');
            });

            it('errors on missing .end', () => {
                input = '.orig x3000\n' +
                        'halt\n';

                expect(() => {
                    assembler.parseString(input);
                }).toThrow('missing an .end');
            });

            it('errors on .end label', () => {
                input = '.orig x3000\n' +
                        'halt\n' +
                        'duh .end\n';

                expect(() => {
                    assembler.parseString(input);
                }).toThrow('should not have a label');
            });

            it('errors on .end with operand', () => {
                input = '.orig x3000\n' +
                        'halt\n' +
                        '.end "ho ho"\n';

                expect(() => {
                    assembler.parseString(input);
                }).toThrow('should not have an operand');
            });

            it('errors on .orig label', () => {
                input = 'duhhhh .orig x3000\n' +
                        'halt\n' +
                        '.end\n';

                expect(() => {
                    assembler.parseString(input);
                }).toThrow('should not have a label');
            });

            it('errors on .orig without operand', () => {
                input = '.orig\n' +
                        'halt\n' +
                        '.end\n';

                expect(() => {
                    assembler.parseString(input);
                }).toThrow('needs an address operand');
            });

            it('errors on .orig with wrong operand type', () => {
                input = '.orig "duhhhh"\n' +
                        'halt\n' +
                        '.end\n';

                expect(() => {
                    assembler.parseString(input)
                }).toThrow('needs an address operand');
            });

            it('errors on stray pseudo-op', () => {
                input = '.blkw 1\n';

                expect(() => {
                    assembler.parseString(input);
                }).toThrow('stray assembler directive');
            });

            it('errors on stray label', () => {
                input = 'doh\n';

                expect(() => {
                    assembler.parseString(input);
                }).toThrow('stray label');
            });

            it('errors on stray instruction', () => {
                input = 'trap x420\n';

                expect(() => {
                    assembler.parseString(input);
                }).toThrow('stray instruction');
            });

            it('errors on dangling operand', () => {
                input = '.orig x3000\n' +
                        'lea r0, mystring puts\n' +
                        'halt\n' +
                        '.end\n';
                expect(() => {
                    assembler.parseString(input);
                }).toThrow('puts');
            });
        });

        describe('assemble(fp)', () => {
            it('assembles trivial program', () => {
                input = '.orig x3000\n' +
                        'halt\n' +
                        '.end\n';

                expect(assembler.assembleString(input)).toEqual([
                    {},
                    [
                        {
                            startAddr: 0x3000,
                            words: [
                                0xf025,
                            ],
                        },
                    ]
                ]);
            });

            it('assembles branch', () => {
                input = '.orig x3000\n' +
                        'fun\n' +
                        'br fun\n' +
                        '.end\n';

                expect(assembler.assembleString(input)).toEqual([
                    {
                        fun: 0x3000,
                    },
                    [
                        {
                            startAddr: 0x3000,
                            words: [
                                0b0000111111111111,
                            ],
                        },
                    ]
                ]);
            });

            it('assembles hello world program', () => {
                input = '.orig x3000\n' +
                        'lea r0, mystring\n' +
                        'puts\n' +
                        'halt\n' +
                        '\n' +
                        '\n' +
                        'mystring .stringz "hello world!"\n' +
                        '.end\n';

                expect(assembler.assembleString(input)).toEqual([
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

            it('assembles multiple sections', () => {
                input = '.orig x3000\n' +
                        'haltme halt\n' +
                        '.end\n' +
                        '\n' +
                        '.orig x4000\n' +
                        'and r1, r2, -3\n' +
                        'halt2 halt\n' +
                        '.end\n';

                expect(assembler.assembleString(input)).toEqual([
                    {
                        haltme: 0x3000,
                        halt2: 0x4001,
                    },
                    [
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
                    ],
                ]);
            });

            it('assembles arithmetic instructions', () => {
                input = '.orig x3000\n' +
                        'add r4, r5, r3\n' +
                        'add r4, r5, 3\n' +
                        'and r6, r3, r2\n' +
                        'and r6, r3, 2\n' +
                        'asdf not r3, r4\n' +
                        '.end\n';

                expect(assembler.assembleString(input)).toEqual([
                    {
                        asdf: 0x3004,
                    },
                    [
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
                    ],
                ]);
            });

            it('assembles branch instructions', () => {
                input = '.orig x3000\n' +
                        'nop\n' +
                        '\n' +
                        'asdf0 brp   asdf0\n' +
                        'asdf1 brz   asdf1\n' +
                        'asdf2 brzp  asdf2\n' +
                        'asdf3 brn   asdf3\n' +
                        'asdf4 brnp  asdf4\n' +
                        'asdf5 brnz  asdf5\n' +
                        'asdf6 brnzp asdf6\n' +
                        'asdf7 br    asdf7\n' +
                        '\n' +
                        'subr jmp r3\n' +
                        'jsr subr\n' +
                        'jsrr r5\n' +
                        'ret\n' +
                        '\n' +
                        'trap x69\n' +
                        '.end\n';

                expect(assembler.assembleString(input)).toEqual([
                    {
                        asdf0: 0x3001,
                        asdf1: 0x3002,
                        asdf2: 0x3003,
                        asdf3: 0x3004,
                        asdf4: 0x3005,
                        asdf5: 0x3006,
                        asdf6: 0x3007,
                        asdf7: 0x3008,
                        subr:  0x3009,
                    },
                    [
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
                    ],
                ]);
            });

            it('assembles memory instructions', () => {
                input = '.orig x3000\n' +
                        'asdf0 ld  r3, asdf0\n' +
                        'asdf1 ldi r4, asdf1\n' +
                        'asdf2 lea r2, asdf2\n' +
                        'ldr r1, r5, -4\n' +
                        '\n' +
                        'asdf3 st  r3, asdf3\n' +
                        'asdf4 sti r4, asdf4\n' +
                        'str r1, r5, -4\n' +
                        '.end\n';

                expect(assembler.assembleString(input)).toEqual([
                    {
                        asdf0: 0x3000,
                        asdf1: 0x3001,
                        asdf2: 0x3002,
                        asdf3: 0x3004,
                        asdf4: 0x3005,
                    },
                    [
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
                    ],
                ]);
            });

            it('assembles trap aliases', () => {
                input = '.orig x3000\n' +
                        'getc\n' +
                        'out\n' +
                        'puts\n' +
                        'in\n' +
                        'halt\n' +
                        '.end\n';

                expect(assembler.assembleString(input)).toEqual([
                    {},
                    [
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
                    ],
                ]);
            });

            it('assembles pseudo-ops', () => {
                input = '.orig x5000\n' +
                        '.blkw 3\n' +
                        '.fill x1337\n' +
                        '.blkw 1\n' +
                        '.fill -2\n' +
                        'label .fill label\n' +
                        '.stringz ""\n' +
                        '.stringz "hi"\n' +
                        '.end\n';

                expect(assembler.assembleString(input)).toEqual([
                    {
                        label: 0x5006,
                    },
                    [
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
                    ],
                ]);
            });

            it('errors on nonexistent label', () => {
                input = '.orig x3000\n' +
                        'lea r0, mystringputs\n' +
                        'halt\n' +
                        '.end\n';

                expect(() => {
                    assembler.assembleString(input)
                }).toThrow('mystringputs');
            });

            it('errors on undersized immediate', () => {
                input = '.orig x3000\n' +
                        'add r0, r0, -64\n' +
                        '.end\n';

                expect(() => {
                    assembler.assembleString(input);
                }).toThrow('-64');
            });

            it('errors on barely undersized immediate', () => {
                input = '.orig x3000\n' +
                        'add r0, r0, -17\n' +
                        '.end\n';

                expect(() => {
                    assembler.assembleString(input);
                }).toThrow('-17');
            });

            it('assembles almost undersized immediate', () => {
                input = '.orig x3000\n' +
                        'add r0, r0, -16\n' +
                        '.end\n';

                expect(assembler.assembleString(input)).toEqual([
                    {},
                    [
                        {
                            startAddr: 0x3000,
                            words: [
                                0b0001000000110000,
                            ],
                        },
                    ],
                ]);
            });

            it('errors on oversized immediate', () => {
                input = '.orig x3000\n' +
                        'add r0, r0, 64\n' +
                        '.end\n';

                expect(() => {
                    assembler.assembleString(input);
                }).toThrow('64');
            });

            it('errors on barely oversized immediate', () => {
                input = '.orig x3000\n' +
                        'add r0, r0, 16\n' +
                        '.end\n';

                expect(() => {
                    assembler.assembleString(input);
                }).toThrow('16');
            });

            it('assembles almost oversized immediate', () => {
                input = '.orig x3000\n' +
                        'add r0, r0, 15\n' +
                        '.end\n';

                expect(assembler.assembleString(input)).toEqual([
                    {},
                    [
                        {
                            startAddr: 0x3000,
                            words: [
                                0b0001000000101111,
                            ],
                        },
                    ],
                ]);
            });

            it('errors on oversized label offset', () => {
                input = '.orig x3000\n' +
                        'ld r3, faraway\n' +
                        '.blkw 1024\n' +
                        'faraway .fill 69\n' +
                        '.end\n';

                expect(() => {
                    assembler.assembleString(input)
                }).toThrow('1024');
            });

            it('errors on barely oversized label offset', () => {
                input = '.orig x3000\n' +
                        'ld r3, faraway\n' +
                        '.blkw 256\n' +
                        'faraway .fill 69\n' +
                        '.end\n';

                expect(() => {
                    assembler.assembleString(input);
                }).toThrow('256');
            });

            it('errors on undersized label offset', () => {
                input = '.orig x3000\n' +
                        'faraway .fill 69\n' +
                        '.blkw 1024\n' +
                        'ld r3, faraway\n' +
                        '.end\n';

                expect(() => {
                    assembler.assembleString(input);
                }).toThrow('-1026');
            });

            it('errors on barely oversized label offset', () => {
                input = '.orig x3000\n' +
                        'faraway .fill 69\n' +
                        '.blkw 255\n' +
                        'ld r3, faraway\n' +
                        '.end\n';

                expect(() => {
                    assembler.assembleString(input);
                }).toThrow('-257');
            });

            it('assembles non-overlapping sections', () => {
                input = '.orig x4001\n' +
                        '.blkw 1\n' +
                        '.end\n' +
                        '.orig x4000\n' +
                        '.blkw 1\n' +
                        '.end\n';

                expect(assembler.assembleString(input)).toEqual([
                    {},
                    [
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
                    ],
                ]);
            });

            it('errors on overlapping sections', () => {
                input = '.orig x4001\n' +
                        '.blkw 1\n' +
                        '.end\n' +
                        '.orig x4000\n' +
                        '.blkw 2\n' +
                        '.end\n';

                expect(() => {
                    assembler.assembleString(input);
                }).toThrow('overlap');
            });

            it('errors on bogus pseudoops with no operands', () => {
                input = '.orig x3000\n' +
                        '.bob\n' +
                        '.end\n';

                expect(() => {
                    assembler.assembleString(input);
                }).toThrow('.bob with no operand');
            });

            it('errors on bogus pseudoops with operand', () => {
                input = '.orig x3000\n' +
                        '.bob "hey ya"\n' +
                        '.end\n';

                expect(() => {
                    assembler.assembleString(input);
                }).toThrow('.bob with string operand');
            });

            it('errors on bogus instructions', () => {
                input = '.orig x3000\n' +
                        'steveo r1, r3, r3\n' +
                        '.end\n';

                expect(() => {
                    assembler.assembleString(input);
                }).toThrow('steveo with operands reg, reg, reg');
            });

            it('errors on barely oversized regnos', () => {
                input = '.orig x3000\n' +
                        'add r0, r0, r8\n' +
                        '.end\n';

                expect(() => {
                    assembler.assembleString(input);
                }).toThrow(/8 .* on line 2/i);
            });

            it('errors on oversized regnos', () => {
                input = '.orig x3000\n' +
                        'add r0, r0, r1000\n' +
                        '.end\n';

                expect(() => {
                    assembler.assembleString(input);
                }).toThrow(/1000 .* on line 2/i);
            });

            it('errors on barely negative non-sign-extended immediates', () => {
                input = '.orig x3000\n' +
                        'trap -1\n' +
                        '.end\n';

                expect(() => {
                    assembler.assembleString(input);
                }).toThrow('-1');
            });

            it('errors on negative non-sign-extended immediates', () => {
                input = '.orig x3000\n' +
                        'trap -1000\n' +
                        '.end\n';

                expect(() => {
                    assembler.assembleString(input);
                }).toThrow('-1000');
            });

            it('errors on barely oversized non-sign-extended immediates', () => {
                input = '.orig x3000\n' +
                        'trap 256\n' +
                        '.end\n';

                expect(() => {
                    assembler.assembleString(input)
                }).toThrow('256');
            });

            it('errors on oversized non-sign-extended immediates', () => {
                input = '.orig x3000\n' +
                        'trap 1000\n' +
                        '.end\n';

                expect(() => {
                    assembler.assembleString(input)
                }).toThrow('1000');
            });

            it('errors on too many operands', () => {
                input = '.orig x3000\n' +
                        'add r0, r0, 3, r0\n' +
                        '.end\n';

                expect(() => {
                    assembler.assembleString(input);
                }).toThrow('reg, reg, int, reg');
            });

            it('errors on too few operands', () => {
                input = '.orig x3000\n' +
                        'add r0, r0\n' +
                        '.end\n';

                expect(() => {
                    assembler.assembleString(input);
                }).toThrow('reg, reg');
            });
        });
    });

    describe('lc-2200', () => {
        beforeEach(() => {
            assembler = new Assembler(getConfig('lc2200'));
        });

        describe('parse(fp)', () => {
            it('parses trivial program', () => {
                input = 'halt\n';

                expect(assembler.parseString(input)).toEqual({
                    sections: [
                        {startAddr: 0, instructions: [
                            {kind: 'instr', line: 1, op: 'halt', operands: []},
                        ]},
                    ],
                    labels: {},
                });
            });

            it('parses label on its own line', () => {
                input = 'fun:\n' +
                        'beq $zero, $zero, fun\n';

                expect(assembler.parseString(input)).toEqual({
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
                input = 'mYlAbeL: halt\n' +
                        'another-label: halt\n' +
                        'LOUD_LABEL: halt\n';

                expect(assembler.parseString(input)).toEqual({
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
                input = 'mylabel: .word 0\n' +
                        'mylabel: .word 0\n';

                expect(() => {
                    assembler.parseString(input);
                }).toThrow('duplicate label mylabel on line 2');
            });

            it('errors on stray label', () => {
                input = 'doh:\n';

                expect(() => {
                    assembler.parseString(input);
                }).toThrow('stray label');
            });

            it('errors on dangling operand', () => {
                input = 'addi $zero, $zero, 34 halt\n' +
                        'halt\n';
                expect(() => {
                    assembler.parseString(input);
                }).toThrow('halt');
            });
        });

        describe('assemble(fp)', () => {
            it('assembles trivial program', () => {
                input = 'halt\n';

                expect(assembler.assembleString(input)).toEqual([
                    {},
                    [
                        {
                            startAddr: 0x0,
                            words: [
                                0x70000000,
                            ],
                        },
                    ],
                ]);
            });

            it('assembles branch', () => {
                input = 'fun:\n' +
                        'beq $zero, $zero, fun\n';

                expect(assembler.assembleString(input)).toEqual([
                    {
                        fun: 0x00,
                    },
                    [
                        {
                            startAddr: 0x0,
                            words: [
                                0x500fffff,
                            ],
                        },
                    ],
                ]);
            });

            it('assembles arithmetic instructions', () => {
                input = 'nop\n' +
                        'add $t0, $s0, $a0\n' +
                        'addi $s2, $t1, 37\n' +
                        'asdf: nand $v0, $s1, $at\n';

                expect(assembler.assembleString(input)).toEqual([
                    {
                        asdf: 0x03,
                    },
                    [
                        {
                            startAddr: 0x0,
                            words: [
                                0x00000000,
                                0x06900003,
                                0x2b700025,
                                0x12a00001,
                            ],
                        },
                    ],
                ]);
            });

            it('assembles branch instructions', () => {
                input = 'asdf0: beq $v0, $t0, asdf0\n' +
                        'jalr $at, $ra\n';

                expect(assembler.assembleString(input)).toEqual([
                    {
                        asdf0: 0x00,
                    },
                    [
                        {
                            startAddr: 0x0,
                            words: [
                                0x526fffff,
                                0x61f00000,
                            ],
                        },
                    ],
                ]);
            });

            it('assembles memory instructions', () => {
                input = 'lw $t0, 33($v0)\n' +
                        'sw $s0, -5($t2)\n';

                expect(assembler.assembleString(input)).toEqual([
                    {},
                    [
                        {
                            startAddr: 0x0,
                            words: [
                                0x36200021,
                                0x498ffffb,
                            ],
                        },
                    ],
                ]);
            });

            it('assembles pseudo-ops', () => {
                input = '.word 0xf0006969\n' +
                        'xd: .word -2\n' +
                        '.word 1056\n' +
                        '.word xd\n';

                expect(assembler.assembleString(input)).toEqual([
                    {
                        xd: 0x01,
                    },
                    [
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
                    ],
                ]);
            });

            it('assembles la', () => {
                input = 'la $t0, trevor\n' +
                        '.word 0\n' +
                        '.word 0\n' +
                        '.word 0\n' +
                        '.word 0\n' +
                        'trevor: .word 0x69\n';

                expect(assembler.assembleString(input)).toEqual([
                    {
                        trevor: 0x06,
                    },
                    [
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
                    ],
                ]);
            });

            it('errors on nonexistent label', () => {
                input = 'beq $zero, $zero, daddy\n' +
                        'halt\n';

                expect(() => {
                    assembler.assembleString(input);
                }).toThrow('daddy');
            });

            it('errors on nonexistent label with la', () => {
                input = 'la $t0, daddy\n' +
                        'halt\n';

                expect(() => {
                    assembler.assembleString(input);
                }).toThrow('daddy');
            });

            it('errors on undersized immediate', () => {
                input = 'addi $zero, $zero, -1000000\n';

                expect(() => {
                    assembler.assembleString(input);
                }).toThrow('-1000000');
            });

            it('errors on barely undersized immediate', () => {
                input = 'addi $zero, $zero, -524289\n';

                expect(() => {
                    assembler.assembleString(input);
                }).toThrow('-524289');
            });

            it('assembles almost undersized immediate', () => {
                input = 'addi $zero, $zero, -524288\n';

                expect(assembler.assembleString(input)).toEqual([
                    {},
                    [
                        {
                            startAddr: 0x0,
                            words: [
                                0x20080000,
                            ],
                        },
                    ],
                ]);
            });

            it('errors on oversized immediate', () => {
                input = 'addi $zero, $zero, 1000000\n';

                expect(() => {
                    assembler.assembleString(input);
                }).toThrow('1000000');
            });

            it('errors on barely oversized immediate', () => {
                input = 'addi $zero, $zero, 524288\n';

                expect(() => {
                    assembler.assembleString(input);
                }).toThrow('524288');
            });

            it('assembles almost oversized immediate', () => {
                input = 'addi $zero, $zero, 524287\n';

                expect(assembler.assembleString(input)).toEqual([
                    {},
                    [
                        {
                            startAddr: 0x0,
                            words: [
                                0x2007ffff,
                            ],
                        },
                    ],
                ]);
            });

            // TODO: figure out how to test label offset sizes without
            //       destroying jest

            it('errors on bogus pseudoops with no operands', () => {
                input = '.bob\n';

                expect(() => {
                    assembler.assembleString(input);
                }).toThrow('.bob with no operand');
            });

            it('errors on bogus pseudoops with operand', () => {
                input = '.bob 3\n';

                expect(() => {
                    assembler.assembleString(input);
                }).toThrow('.bob with int operand');
            });

            it('errors on bogus instructions without operands', () => {
                input = 'water\n';

                expect(() => {
                    assembler.assembleString(input);
                }).toThrow('water with no operands');
            });

            it('errors on bogus instructions with operands', () => {
                input = 'steveo $t0, $t1, $t2\n';

                expect(() => {
                    assembler.assembleString(input);
                }).toThrow('steveo with operands reg, reg, reg');
            });

            it('errors on barely oversized regnos', () => {
                input = 'add $zero, $zero, $16\n';

                expect(() => {
                    assembler.assembleString(input);
                }).toThrow(/16 .* on line 1/i);
            });

            it('errors on oversized regnos', () => {
                input = 'add $zero, $zero, $1000\n';

                expect(() => {
                    assembler.assembleString(input);
                }).toThrow(/1000 .* on line 1/i);
            });

            it('errors on bogus reg aliases', () => {
                input = 'add $zero, $zero, $feces\n';

                expect(() => {
                    assembler.assembleString(input);
                }).toThrow('feces');
            });

            it('errors on too many operands', () => {
                input = 'add $0, $0, 3, $0\n';

                expect(() => {
                    assembler.assembleString(input);
                }).toThrow('reg, reg, int, reg');
            });

            it('errors on too few operands', () => {
                input = 'add $0, $0\n';

                expect(() => {
                    assembler.assembleString(input);
                }).toThrow('reg, reg');
            });
        });
    });
});
