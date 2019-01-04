import { Readable } from 'stream';
import { Isa } from './isa';
import { ParsedAssembly, Parser } from './parsers';
import { Scanner } from './scanner';

class Assembler {
    private scanner: Scanner;
    private parser: Parser;
    private isa: Isa;

    public constructor(parser: Parser, isa: Isa) {
        this.scanner = new Scanner();
        this.parser = parser;
        this.isa = isa;
    }

    public async parse(fp: Readable): Promise<ParsedAssembly> {
        return this.parser.parse(this.isa, await this.scanner.scan(fp));
    }
}

export { Assembler };
