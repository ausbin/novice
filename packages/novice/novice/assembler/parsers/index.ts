import { Isa } from '../../isa';
import ComplxParser from './complx';
import Lc2200Parser from './lc2200';
import { Parser } from './parser';

const parsers: {[s: string]: new(isa: Isa) => Parser} = {
    complx: ComplxParser,
    lc2200: Lc2200Parser,
};

export { Parser, parsers };
