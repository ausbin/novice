import { Readable } from 'stream';
import { MachineCodeGenerator, MachineCodeSection } from './codegen';
import { Isa } from './isa';
import { ParsedAssembly, Parser } from './parsers';
import { Scanner } from './scanner';

class Assembler {
    private scanner: Scanner;
    private parser: Parser;
    private generator: MachineCodeGenerator;
    private isa: Isa;

    public constructor(parser: Parser,
                       generator: MachineCodeGenerator,
                       isa: Isa) {
        this.scanner = new Scanner();
        this.parser = parser;
        this.generator = generator;
        this.isa = isa;
    }

    public async parse(fp: Readable): Promise<ParsedAssembly> {
        return this.parser.parse(this.isa, await this.scanner.scan(fp));
    }

    public codegen(asm: ParsedAssembly): MachineCodeSection[] {
        return this.generator.gen(this.isa, asm);
    }

    public async assemble(fp: Readable): Promise<MachineCodeSection[]> {
        return this.codegen(await this.parse(fp));
    }
}

export { Assembler };
