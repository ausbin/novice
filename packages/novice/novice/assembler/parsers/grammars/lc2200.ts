import { Isa, regPrefixes } from '../../../isa';
import { CommentDFA, IntegerDFA, PseudoOpDFA, RegDFA, SymbolDFA,
         WhitespaceDFA, WordDFA } from '../../dfa';
import { Production } from '../../lr1';
import { Grammar } from '../grammar';

const TsObj = {
    'int-dec'  : '',
    'int-hex'  : '',
    'reg'      : '',
    'pseudoop' : '',
    'word'     : '',
    ','        : '',
    '('        : '',
    ')'        : '',
    ':'        : '',
};
type T = keyof typeof TsObj;
const Ts = new Set(Object.keys(TsObj) as T[]);

const NTsObj = {
    'line'             : '',
    'label'            : '',
    'instr-operands'   : '',
    'instr'            : '',
    'operand'          : '',
    'pseudoop-line'    : '',
    'pseudoop-operand' : '',
};
type NT = keyof typeof NTsObj;
const NTs = new Set(Object.keys(NTsObj) as NT[]);

const productions: Production<NT, T>[] = [
    {lhs: 'line', rhs: ['label']},
    {lhs: 'line', rhs: ['instr']},
    {lhs: 'line', rhs: ['pseudoop-line']},
    {lhs: 'label', rhs: []},
    {lhs: 'label', rhs: ['label', 'word', ':']},
    {lhs: 'instr', rhs: ['label', 'word']},
    {lhs: 'instr', rhs: ['label', 'word', 'instr-operands']},
    {lhs: 'instr-operands', rhs: ['operand']},
    {lhs: 'instr-operands', rhs: ['instr-operands', ',', 'operand']},
    {lhs: 'instr-operands', rhs: ['instr-operands', '(', 'operand', ')']},
    {lhs: 'operand', rhs: ['word']},
    {lhs: 'operand', rhs: ['int-dec']},
    {lhs: 'operand', rhs: ['int-hex']},
    {lhs: 'operand', rhs: ['reg']},
    {lhs: 'pseudoop-line', rhs: ['label', 'pseudoop']},
    {lhs: 'pseudoop-line', rhs: ['label', 'pseudoop', 'pseudoop-operand']},
    {lhs: 'pseudoop-operand', rhs: ['word']},
    {lhs: 'pseudoop-operand', rhs: ['int-dec']},
    {lhs: 'pseudoop-operand', rhs: ['int-hex']},
];
const goal: NT = 'line';

// Make this a function so we don't create unnecessary instances in
// memory for unused parsers
const getDFAs = (isa: Isa) => [
    new CommentDFA<T>(['!']),
    new IntegerDFA<T>({hex: 'int-hex', dec: 'int-dec'}),
    new PseudoOpDFA<T>({pseudoOp: 'pseudoop'}),
    // TODO: make this dependent on ISA having aliases, don't assume so
    new RegDFA<T>({reg: 'reg'}, regPrefixes(isa), true),
    new SymbolDFA<T>([',', '(', ')', ':']),
    new WhitespaceDFA<T>(),
    new WordDFA<T>({word: 'word'}),
];

const grammar: Grammar<NT, T> = { NTs, Ts, productions, goal, getDFAs };

export { NT, T, grammar };
