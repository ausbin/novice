import { Isa } from '../../isa';
import ComplxParser from './complx';
import Lc2200Parser from './lc2200';
import { Instruction, ParsedAssembly, Parser, PseudoOp, Section } from './parser';

const parsers: {[s: string]: new(isa: Isa) => Parser} = {
    complx: ComplxParser,
    lc2200: Lc2200Parser,
};

export { ParsedAssembly, Section, Parser, parsers, Instruction, PseudoOp };
