import { Readable } from 'stream';
import { ParsedAssembly, Parser } from './parsers';
import { Scanner } from './scanner';

class Assembler {
    private scanner: Scanner;
    private parser: Parser;

    public constructor(parser: Parser) {
        this.scanner = new Scanner();
        this.parser = parser;
    }

    public async parse(fp: Readable): Promise<ParsedAssembly> {
        return this.parser.parse(await this.scanner.scan(fp));
    }
}

export { Assembler };
