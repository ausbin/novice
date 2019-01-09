import { AsmContext, OpOperands, PseudoOpSpec } from './opspec';

const complxOpSpec: PseudoOpSpec = {
    ops: [
        {name: 'fill',
         operands: [{kind: 'int', name: 'num'}],
         asm: (ctx: AsmContext, operands: OpOperands) =>
            // TODO: complain if too big
            [operands.ints.num & ~(-1 << ctx.isa.mem.addressability)]},

        {name: 'fill',
         operands: [{kind: 'label', name: 'label'}],
         asm: (ctx: AsmContext, operands: OpOperands) =>
            // TODO: complain if nonexistent
            [ctx.symbtable[operands.labels.label]]},

        {name: 'stringz',
         operands: [{kind: 'string', name: 'str'}],
         asm: (ctx: AsmContext, operands: OpOperands) =>
            // TODO: how is non-ascii handled? probably blow up
            operands.strings.str.split('').map(c => c.charCodeAt(0)).concat([0])},

        {name: 'blkw',
         operands: [{kind: 'int', name: 'count'}],
         asm: (ctx: AsmContext, operands: OpOperands) => {
            // TODO: needs to be randomized
            const result = new Array<number>(operands.ints.count);
            for (let i = 0; i < result.length; i++) {
                result[i] = 0;
            }
            return result;
        }},
    ],
};

export { complxOpSpec };
