import CommentDFA from './comment';
import DFA from './dfa';
import IntegerDFA from './integer';
import LabelDFA from './label';
import PseudoOpDFA from './pseudoop';
import StringDFA from './string';
import SymbolDFA from './symbol';
import WhitespaceDFA from './whitespace';
import WordDFA from './word';

const dfas = [ WhitespaceDFA, LabelDFA, WordDFA, PseudoOpDFA, IntegerDFA,
               SymbolDFA, StringDFA, CommentDFA ];
export { dfas, DFA };
