import ComplxParser from './complx';
import { ParsedAssembly, Parser, Section } from './parser';

const parsers: {[s: string]: new() => Parser} = {
    complx: ComplxParser,
};

export { ParsedAssembly, Section, Parser, parsers };
