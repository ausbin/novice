import { Assembly, Isa, MachineCodeSection, SymbTable } from '../isa';
import { MachineCodeGenerator } from './codegen';
import { PseudoOpSpec } from './opspec';
import { Parser } from './parsers';

interface AssemblerConfig {
    parser: Parser;
    generator: MachineCodeGenerator;
    isa: Isa;
    opSpec: PseudoOpSpec;
}

class Assembler {
    protected cfg: AssemblerConfig;

    public constructor(cfg: AssemblerConfig) {
        this.cfg = cfg;
    }

    public feedChars(buf: string): void {
        this.cfg.parser.feedChars(buf);
    }

    public finishParsing(): Assembly {
        return this.cfg.parser.finish();
    }

    public parseString(str: string): Assembly {
        this.feedChars(str);
        return this.finishParsing();
    }

    public codegen(asm: Assembly): [SymbTable, MachineCodeSection[]] {
        return this.cfg.generator.gen(asm);
    }

    public assembleString(str: string): [SymbTable, MachineCodeSection[]] {
        return this.codegen(this.parseString(str));
    }
}

export { Assembler, AssemblerConfig };
