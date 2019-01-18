import { Isa } from '../../isa';
import ComplxParser from './complx';
import { Instruction, ParsedAssembly, Parser, PseudoOp, Section } from './parser';

const parsers: {[s: string]: new(isa: Isa) => Parser} = {
    complx: ComplxParser,
};

export { ParsedAssembly, Section, Parser, parsers, Instruction, PseudoOp };
