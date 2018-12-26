import { Assembler } from './assembler';
import { Parser, parsers } from './parsers';

function getParser(parserName: string): Parser {
    if (!parsers.hasOwnProperty(parserName)) {
        throw new Error(`no such parser \`${parserName}'\n`);
    }

    return new parsers[parserName]();
}

export { Assembler, getParser };
