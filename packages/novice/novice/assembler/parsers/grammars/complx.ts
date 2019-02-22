import { Isa } from '../../../isa';
import { CommentDFA, IntegerDFA, PseudoOpDFA, RegDFA, StringDFA, SymbolDFA,
         WhitespaceDFA, WordDFA } from '../../dfa';
import { Production } from '../../lr1';
import { Grammar } from '../grammar';

const TsObj = {
    'int-decimal' : '',
    'int-hex'     : '',
    'reg'         : '',
    'pseudoop'    : '',
    'string'      : '',
    'char'        : '',
    'word'        : '',
    ','           : '',
    '#'           : '',
};
type T = keyof typeof TsObj;
const Ts = new Set(Object.keys(TsObj) as T[]);

const NTsObj = {
    'line'             : '',
    'instr-line'       : '',
    'instr-operands'   : '',
    'instr'            : '',
    'operand'          : '',
    'pseudoop-line'    : '',
    'pseudoop-call'    : '',
    'pseudoop-operand' : '',
};
type NT = keyof typeof NTsObj;
const NTs = new Set(Object.keys(NTsObj) as NT[]);

const productions: Production<NT, T>[] = [
    {lhs: 'line', rhs: ['word']},
    {lhs: 'line', rhs: ['instr-line']},
    {lhs: 'line', rhs: ['pseudoop-line']},
    {lhs: 'instr-line', rhs: ['word', 'instr']},
    {lhs: 'instr-line', rhs: ['instr']},
    {lhs: 'instr', rhs: ['word', 'instr-operands']},
    {lhs: 'instr-operands', rhs: ['operand']},
    {lhs: 'instr-operands', rhs: ['instr-operands', ',', 'operand']},
    {lhs: 'operand', rhs: ['word']},
    {lhs: 'operand', rhs: ['int-decimal']},
    {lhs: 'operand', rhs: ['#', 'int-decimal']},
    {lhs: 'operand', rhs: ['int-hex']},
    {lhs: 'operand', rhs: ['#', 'int-hex']},
    {lhs: 'operand', rhs: ['reg']},
    {lhs: 'pseudoop-line', rhs: ['word', 'pseudoop-call']},
    {lhs: 'pseudoop-line', rhs: ['pseudoop-call']},
    {lhs: 'pseudoop-call', rhs: ['pseudoop']},
    {lhs: 'pseudoop-call', rhs: ['pseudoop', 'pseudoop-operand']},
    {lhs: 'pseudoop-operand', rhs: ['word']},
    {lhs: 'pseudoop-operand', rhs: ['int-decimal']},
    {lhs: 'pseudoop-operand', rhs: ['#', 'int-decimal']},
    {lhs: 'pseudoop-operand', rhs: ['int-hex']},
    {lhs: 'pseudoop-operand', rhs: ['#', 'int-hex']},
    {lhs: 'pseudoop-operand', rhs: ['char']},
    {lhs: 'pseudoop-operand', rhs: ['string']},
];
const goal: NT = 'line';

// Make this a function so we don't create unnecessary instances in
// memory for unused parsers
const getDFAs = (isa: Isa) => [
    new CommentDFA<T>([';']),
    new IntegerDFA<T>({hex: 'int-hex', dec: 'int-decimal'}, true),
    new PseudoOpDFA<T>({pseudoOp: 'pseudoop'}),
    new RegDFA<T>({reg: 'reg'}, isa.regPrefixes()),
    new StringDFA<T>({string: 'string', char: 'char'}),
    new SymbolDFA<T>([',', '#']),
    new WhitespaceDFA<T>(),
    new WordDFA<T>({word: 'word'}),
];

const grammar: Grammar<NT, T> = { NTs, Ts, productions, goal, getDFAs };

export { NT, T, grammar };
