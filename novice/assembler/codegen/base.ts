import { ParsedAssembly, Section } from '../parsers';
import { MachineCodeGenerator, MachineCodeSection } from './codegen';

class BaseMachineCodeGenerator implements MachineCodeGenerator {
    public gen(asm: ParsedAssembly): MachineCodeSection[] {
        return [];
    }
}

export { BaseMachineCodeGenerator };
