import { Isa } from '../isa';
import { ParsedAssembly } from '../parsers';

interface MachineCodeSection {
    startAddr: number;
    words: number[];
}

interface MachineCodeGenerator {
    gen(isa: Isa, asm: ParsedAssembly): MachineCodeSection[];
}

export { MachineCodeSection, MachineCodeGenerator };
