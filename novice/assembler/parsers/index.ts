import ComplxParser from './complx';
import { ParsedAssembly, Parser } from './parser';

const parsers: {[s: string]: new() => Parser} = {
    complx: ComplxParser,
};

export { ParsedAssembly, Parser, parsers };
