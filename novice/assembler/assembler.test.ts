import { Readable } from 'stream';
import { Assembler } from './assembler';

describe('assembler', () => {
    describe('parse()', () => {
        let fp: Readable;

        beforeEach(() => {
            fp = new Readable();
        });

        it('parses trivial program', () => {
            const assembler = new Assembler(fp);

            fp.push('.orig x3000\n')
            fp.push('halt\n')
            fp.push('.end\n')
            fp.push(null)

            expect.hasAssertions();
            return assembler.parse().then(assembly => {
                expect(assembly).toEqual({
                    sections: [
                        {startAddr: 0x3000, instructions: [
                            {kind: 'instr', op: 'halt', operands: []},
                        ]},
                    ],
                    labels: {},
                });
            });
        });

        it('parses hello world program', () => {
            const assembler = new Assembler(fp);

            fp.push('.orig x3000\n')
            fp.push('lea r0, mystring\n')
            fp.push('puts\n')
            fp.push('halt\n')
            fp.push('\n');
            fp.push('\n');
            fp.push('mystring: .stringz "hello world!"\n')
            fp.push('.end\n')
            fp.push(null)

            expect.hasAssertions();
            return assembler.parse().then(assembly => {
                expect(assembly).toEqual({
                    sections: [
                        {startAddr: 0x3000, instructions: [
                            {kind: 'instr', op: 'lea', operands: [
                                {kind: 'reg',   num: 0},
                                {kind: 'label', label: 'mystring'},
                            ]},
                            {kind: 'instr', op: 'puts', operands: []},
                            {kind: 'instr', op: 'halt', operands: []},
                            {kind: 'pseudoop', op: 'stringz', operand:
                                {kind: 'string', contents: "hello world!"},
                            },
                        ]},
                    ],
                    labels: {
                        'mystring': [0, 3]
                    },
                });
            });
        });

        it('parses multiple sections', () => {
            const assembler = new Assembler(fp);

            fp.push('.orig x3000\n')
            fp.push('halt: halt\n')
            fp.push('.end\n')
            fp.push('\n')
            fp.push('.orig x4000\n')
            fp.push('and r0, r0, -3\n')
            fp.push('halt2: halt\n')
            fp.push('.end\n')
            fp.push(null)

            expect.hasAssertions();
            return assembler.parse().then(assembly => {
                expect(assembly).toEqual({
                    sections: [
                        {startAddr: 0x3000, instructions: [
                            {kind: 'instr', op: 'halt', operands: []},
                        ]},
                        {startAddr: 0x4000, instructions: [
                            {kind: 'instr', op: 'and', operands: [
                                {kind: 'reg', num: 0},
                                {kind: 'reg', num: 0},
                                {kind: 'int', val: -3},
                            ]},
                            {kind: 'instr', op: 'halt', operands: []},
                        ]},
                    ],
                    labels: {
                        'halt':  [0, 0],
                        'halt2': [1, 1],
                    },
                });
            });
        });
    });
});
