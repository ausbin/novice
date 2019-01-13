import { Readable } from 'stream';
import { getConfig, Assembler } from '.';

describe('assembler', () => {
    describe('parse(fp)', () => {
        let fp: Readable;
        let assembler: Assembler;

        beforeEach(() => {
            fp = new Readable();
            // Test the complx parser and lc3 isa for now
            assembler = new Assembler(getConfig('lc3'));
        });

        it('parses trivial program', () => {
            fp.push('.orig x3000\n')
            fp.push('add\n')
            fp.push('.end\n')
            fp.push(null)

            return expect(assembler.parse(fp)).resolves.toEqual({
                sections: [
                    {startAddr: 0x3000, instructions: [
                        {kind: 'instr', op: 'add', operands: []},
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
                        {kind: 'instr', op: 'br', operands: [
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
                        {kind: 'instr', op: 'halt', operands: []},
                        {kind: 'pseudoop', op: 'blkw', operand:
                            {kind: 'int', val: 1}},
                        {kind: 'pseudoop', op: 'blkw', operand:
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
                        {kind: 'pseudoop', op: 'fill', operand:
                            {kind: 'int', val: '\n'.charCodeAt(0)}},
                        {kind: 'pseudoop', op: 'fill', operand:
                            {kind: 'int', val: '\r'.charCodeAt(0)}},
                        {kind: 'pseudoop', op: 'fill', operand:
                            {kind: 'int', val: '\t'.charCodeAt(0)}},
                        {kind: 'pseudoop', op: 'fill', operand:
                            {kind: 'int', val: '\\'.charCodeAt(0)}},
                        {kind: 'pseudoop', op: 'fill', operand:
                            {kind: 'int', val: '\''.charCodeAt(0)}},
                        {kind: 'pseudoop', op: 'fill', operand:
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
    });
});
