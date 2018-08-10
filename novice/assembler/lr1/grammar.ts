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
    new Production<NT, T>('line', ['label']),
    new Production<NT, T>('line', ['instr-line']),
    new Production<NT, T>('line', ['pseudoop-line']),
    new Production<NT, T>('label', ['word', ':']),
    new Production<NT, T>('instr-line', ['label', 'instr']),
    new Production<NT, T>('instr-line', ['instr']),
    new Production<NT, T>('instr', ['word']),
    new Production<NT, T>('instr', ['instr', ',', 'operand']),
    new Production<NT, T>('instr', ['instr', '(', 'operand', ')']),
    new Production<NT, T>('operand', ['word']),
    new Production<NT, T>('operand', ['int-decimal']),
    new Production<NT, T>('operand', ['int-hex']),
    new Production<NT, T>('operand', ['reg']),
    new Production<NT, T>('pseudoop-line', ['pseudoop']),
    new Production<NT, T>('pseudoop-line', ['pseudoop', 'pseudoop-operand']),
    new Production<NT, T>('pseudoop-operand', ['operand']),
    new Production<NT, T>('pseudoop-operand', ['char']),
    new Production<NT, T>('pseudoop-operand', ['string']),
];

export { Production, grammar, T, Ts, NT, NTs };
