import { Assembly, MachineCodeSection, SymbTable } from '../../isa';

interface MachineCodeGenerator {
    gen(asm: Assembly): [SymbTable, MachineCodeSection[]];
}

export { MachineCodeGenerator };
