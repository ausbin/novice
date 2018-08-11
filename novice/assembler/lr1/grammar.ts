import { Kind as T, kinds as Ts } from '../scanner';
import { Production } from './production';

const NTsObj = {
    'line'             : '',
    'label'            : '',
    'instr-line'       : '',
    'instr'            : '',
    'operand'          : '',
    'pseudoop-line'    : '',
    'pseudoop-operand' : '',
};
type NT = keyof typeof NTsObj;
const NTs = new Set(Object.keys(NTsObj) as NT[]);

const grammar: Production<NT, T>[] = [
    {lhs: 'line', rhs: ['label']},
    {lhs: 'line', rhs: ['instr-line']},
    {lhs: 'line', rhs: ['pseudoop-line']},
    {lhs: 'label', rhs: ['word', ':']},
    {lhs: 'instr-line', rhs: ['label', 'instr']},
    {lhs: 'instr-line', rhs: ['instr']},
    {lhs: 'instr', rhs: ['word']},
    {lhs: 'instr', rhs: ['instr', ',', 'operand']},
    {lhs: 'instr', rhs: ['instr', '(', 'operand', ')']},
    {lhs: 'operand', rhs: ['word']},
    {lhs: 'operand', rhs: ['int-decimal']},
    {lhs: 'operand', rhs: ['int-hex']},
    {lhs: 'operand', rhs: ['reg']},
    {lhs: 'pseudoop-line', rhs: ['pseudoop']},
    {lhs: 'pseudoop-line', rhs: ['pseudoop', 'pseudoop-operand']},
    {lhs: 'pseudoop-operand', rhs: ['operand']},
    {lhs: 'pseudoop-operand', rhs: ['char']},
    {lhs: 'pseudoop-operand', rhs: ['string']},
];
const goal = 'line';

export { Production, goal, grammar, T, Ts, NT, NTs };
