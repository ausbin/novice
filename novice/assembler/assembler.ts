import { Readable, Writable } from 'stream';
import { Isa } from '../isa';
import { MachineCodeGenerator, MachineCodeSection } from './codegen';
import { PseudoOpSpec } from './opspec';
import { ParsedAssembly, Parser } from './parsers';
import { Serializer } from './serializers';

interface AssemblerConfig {
    parser: Parser;
    generator: MachineCodeGenerator;
    isa: Isa;
    opSpec: PseudoOpSpec;
    serializer: Serializer;
}

class Assembler {
    private cfg: AssemblerConfig;

    public constructor(cfg: AssemblerConfig) {
        this.cfg = cfg;
    }

    public async parse(fp: Readable): Promise<ParsedAssembly> {
        return await this.cfg.parser.parse(fp);
    }

    public codegen(asm: ParsedAssembly): MachineCodeSection[] {
        return this.cfg.generator.gen(this.cfg.isa, this.cfg.opSpec, asm);
    }

    public async assemble(fp: Readable): Promise<MachineCodeSection[]> {
        return this.codegen(await this.parse(fp));
    }

    public async assembleTo(inFp: Readable, outFp: Writable): Promise<void> {
        this.cfg.serializer.serialize(
            this.cfg.isa, await this.assemble(inFp), outFp);
    }
}

export { Assembler, AssemblerConfig };
