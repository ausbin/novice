import { IsaSpec } from './isa';

const dummyIsaSpec: IsaSpec = {
    pc: {
        increment: 0,
        resetVector: 0,
        instrBits: 0,
    },
    mem: {
        word: 0,
        space: 0,
        addressability: 0,
    },
    regs: [],
    instructions: [],
    aliases: [],
};

export { dummyIsaSpec };
