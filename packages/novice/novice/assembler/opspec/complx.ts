import { AsmContext, oneWord, OpOperands, PseudoOpSpec } from './opspec';

const complxOpSpec: PseudoOpSpec = {
    ops: [
        {op: 'fill',
         operands: [{kind: 'int', name: 'num'}],
         asm: (ctx: AsmContext, operands: OpOperands) =>
            // TODO: use util functions instead of this crap
            [operands.ints.num & ~(-1 << ctx.isa.spec.mem.addressability)]},

        {op: 'fill',
         operands: [{kind: 'label', name: 'label'}],
         size: oneWord,
         asm: (ctx: AsmContext, operands: OpOperands) =>
            // TODO: complain if nonexistent
            [ctx.symbtable[operands.labels.label]]},

        {op: 'stringz',
         operands: [{kind: 'string', name: 'str'}],
         asm: (ctx: AsmContext, operands: OpOperands) =>
            // TODO: how is non-ascii handled? probably blow up
            operands.strings.str.split('').map(c => c.charCodeAt(0)).concat([0])},

        {op: 'blkw',
         operands: [{kind: 'int', name: 'count'}],
         asm: (ctx: AsmContext, operands: OpOperands) => {
            // TODO: needs to be randomized/uninitialized
            const result = new Array<number>(operands.ints.count);
            for (let i = 0; i < result.length; i++) {
                result[i] = 0;
            }
            return result;
        }},
    ],
};

export { complxOpSpec };
