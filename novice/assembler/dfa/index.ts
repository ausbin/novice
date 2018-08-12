import CommentDFA from './comment';
import { DFA, Kind, kinds } from './dfa';
import IntegerDFA from './integer';
import PseudoOpDFA from './pseudoop';
import StringDFA from './string';
import SymbolDFA from './symbol';
import WhitespaceDFA from './whitespace';
import WordDFA from './word';

const dfas = [ WhitespaceDFA, IntegerDFA, WordDFA, PseudoOpDFA, SymbolDFA,
               StringDFA, CommentDFA ];
export { dfas, DFA, Kind, kinds };
