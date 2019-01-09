import ComplxParser from './complx';
import { Instruction, ParsedAssembly, Parser, PseudoOp, Section } from './parser';

const parsers: {[s: string]: new() => Parser} = {
    complx: ComplxParser,
};

export { ParsedAssembly, Section, Parser, parsers, Instruction, PseudoOp };
