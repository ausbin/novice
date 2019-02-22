import { maskTo } from '../../util';
import { AsmContext, oneWord, OpOperands, PseudoOpSpec } from './opspec';

const wordOpSpec: PseudoOpSpec = {
    ops: [
        {op: 'word',
         operands: [{kind: 'int', name: 'num'}],
         asm: (ctx: AsmContext, operands: OpOperands) =>
            // TODO: complain if too big
            [maskTo(operands.ints.num, ctx.isa.spec.mem.addressability)]},

        {op: 'word',
         operands: [{kind: 'label', name: 'label'}],
         size: oneWord,
         asm: (ctx: AsmContext, operands: OpOperands) =>
            // TODO: complain if nonexistent
            [ctx.symbtable[operands.labels.label]]},
    ],
};

export { wordOpSpec };
