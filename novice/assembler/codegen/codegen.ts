import { Assembly, Isa, MachineCodeSection, SymbTable } from '../../isa';
import { PseudoOpSpec } from '../opspec';

interface MachineCodeGenerator {
    gen(isa: Isa, opSpec: PseudoOpSpec, asm: Assembly):
        [SymbTable, MachineCodeSection[]];
}

export { MachineCodeGenerator };
