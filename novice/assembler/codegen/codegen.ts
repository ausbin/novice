import { ParsedAssembly } from '../parsers';

interface MachineCodeSection {
    startAddr: number;
    length: number;
    words: number[];
}

interface MachineCodeGenerator {
    gen(asm: ParsedAssembly): MachineCodeSection[];
}

export { MachineCodeSection, MachineCodeGenerator };
