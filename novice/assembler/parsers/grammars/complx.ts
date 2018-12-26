import { Production } from '../../lr1';
import { Grammar, T } from '../grammar';

const NTsObj = {
    'line'             : '',
    'label'            : '',
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
    {lhs: 'line', rhs: ['label']},
    {lhs: 'line', rhs: ['instr-line']},
    {lhs: 'line', rhs: ['pseudoop-line']},
    {lhs: 'label', rhs: ['word', ':']},
    {lhs: 'instr-line', rhs: ['label', 'instr']},
    {lhs: 'instr-line', rhs: ['instr']},
    {lhs: 'instr', rhs: ['word']},
    {lhs: 'instr', rhs: ['word', 'instr-operands']},
    {lhs: 'instr-operands', rhs: ['operand']},
    {lhs: 'instr-operands', rhs: ['instr-operands', ',', 'operand']},
    {lhs: 'instr-operands', rhs: ['instr-operands', '(', 'operand', ')']},
    {lhs: 'operand', rhs: ['word']},
    {lhs: 'operand', rhs: ['int-decimal']},
    {lhs: 'operand', rhs: ['int-hex']},
    {lhs: 'operand', rhs: ['reg']},
    {lhs: 'pseudoop-line', rhs: ['label', 'pseudoop-call']},
    {lhs: 'pseudoop-line', rhs: ['pseudoop-call']},
    {lhs: 'pseudoop-call', rhs: ['pseudoop']},
    {lhs: 'pseudoop-call', rhs: ['pseudoop', 'pseudoop-operand']},
    {lhs: 'pseudoop-operand', rhs: ['word']},
    {lhs: 'pseudoop-operand', rhs: ['int-decimal']},
    {lhs: 'pseudoop-operand', rhs: ['int-hex']},
    {lhs: 'pseudoop-operand', rhs: ['char']},
    {lhs: 'pseudoop-operand', rhs: ['string']},
];
const goal: NT = 'line';

const grammar: Grammar<NT> = { NTs, productions, goal };

export { NT, T, grammar };
