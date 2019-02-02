import { Readable, Writable } from 'stream';
import { Assembly, Isa, MachineCodeSection, SymbTable } from '../isa';
import { MachineCodeGenerator } from './codegen';
import { PseudoOpSpec } from './opspec';
import { Parser } from './parsers';
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

    public async parse(fp: Readable): Promise<Assembly> {
        return await this.cfg.parser.parse(fp);
    }

    public codegen(asm: Assembly): [SymbTable, MachineCodeSection[]] {
        return this.cfg.generator.gen(this.cfg.isa, this.cfg.opSpec, asm);
    }

    public async assemble(fp: Readable):
            Promise<[SymbTable, MachineCodeSection[]]> {
        return this.codegen(await this.parse(fp));
    }

    public async assembleTo(inFp: Readable, outFp: Writable,
                            symbFp: Writable): Promise<void> {
        const [symbtable, code] = await this.assemble(inFp);
        this.cfg.serializer.serialize(this.cfg.isa, code, outFp);
        this.cfg.serializer.serializeSymb(symbtable, symbFp);
    }
}

export { Assembler, AssemblerConfig };
