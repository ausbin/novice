import { Readable } from 'stream';
import { MachineCodeGenerator, MachineCodeSection } from './codegen';
import { Isa } from './isa';
import { PseudoOpSpec } from './opspec';
import { ParsedAssembly, Parser } from './parsers';
import { Scanner } from './scanner';

interface AssemblerConfig {
    parser: Parser;
    generator: MachineCodeGenerator;
    isa: Isa;
    opSpec: PseudoOpSpec;
}

class Assembler {
    private scanner: Scanner;
    private cfg: AssemblerConfig;

    public constructor(cfg: AssemblerConfig) {
        this.scanner = new Scanner();
        this.cfg = cfg;
    }

    public async parse(fp: Readable): Promise<ParsedAssembly> {
        return this.cfg.parser.parse(this.cfg.isa, await this.scanner.scan(fp));
    }

    public codegen(asm: ParsedAssembly): MachineCodeSection[] {
        return this.cfg.generator.gen(this.cfg.isa, this.cfg.opSpec, asm);
    }

    public async assemble(fp: Readable): Promise<MachineCodeSection[]> {
        return this.codegen(await this.parse(fp));
    }
}

export { Assembler, AssemblerConfig };
