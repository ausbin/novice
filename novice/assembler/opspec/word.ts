import { maskTo } from '../../util';
import { AsmContext, oneWord, OpOperands, PseudoOpSpec } from './opspec';

const wordOpSpec: PseudoOpSpec = {
    ops: [
        {name: 'word',
         operands: [{kind: 'int', name: 'num'}],
         asm: (ctx: AsmContext, operands: OpOperands) =>
            // TODO: complain if too big
            [maskTo(operands.ints.num, ctx.isa.mem.addressability)]},

        {name: 'word',
         operands: [{kind: 'label', name: 'label'}],
         size: oneWord,
         asm: (ctx: AsmContext, operands: OpOperands) =>
            // TODO: complain if nonexistent
            [ctx.symbtable[operands.labels.label]]},
    ],
};

export { wordOpSpec };
