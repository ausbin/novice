import { Isa } from '../../isa';
import { PseudoOpSpec } from '../opspec';
import { ParsedAssembly } from '../parsers';

interface MachineCodeSection {
    startAddr: number;
    words: number[];
}

interface MachineCodeGenerator {
    gen(isa: Isa, opSpec: PseudoOpSpec, asm: ParsedAssembly): MachineCodeSection[];
}

export { MachineCodeSection, MachineCodeGenerator };
