import { Assembler } from './assembler';
import { Isa, isas } from './isa';
import { Parser, parsers } from './parsers';

function getParser(parserName: string): Parser {
    if (!parsers.hasOwnProperty(parserName)) {
        throw new Error(`no such parser \`${parserName}'\n`);
    }

    return new parsers[parserName]();
}

function getIsa(isaName: string): Isa {
    if (!isas.hasOwnProperty(isaName)) {
        throw new Error(`no such isa \`${isaName}'\n`);
    }

    return isas[isaName];
}

export { Assembler, getParser, getIsa };
