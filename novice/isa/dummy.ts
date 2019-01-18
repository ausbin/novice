import { Isa } from './isa';

const DummyIsa: Isa = {
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
};

export { DummyIsa };
