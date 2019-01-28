import { Assembly, Isa, SymbTable } from '../../isa';
import { PseudoOpSpec } from '../opspec';

interface MachineCodeSection {
    startAddr: number;
    words: number[];
}

interface MachineCodeGenerator {
    gen(isa: Isa, opSpec: PseudoOpSpec, asm: Assembly):
        [SymbTable, MachineCodeSection[]];
}

export { MachineCodeSection, MachineCodeGenerator };
