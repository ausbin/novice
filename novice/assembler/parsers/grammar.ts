import { Isa } from '../../isa';
import { DFA } from '../dfa';
import { Production } from '../lr1';

interface Grammar<NT, T> {
    NTs: Set<NT>;
    Ts: Set<T>;
    productions: Production<NT, T>[];
    goal: NT;
    getDFAs(isa: Isa): DFA<T>[];
}

export { Grammar };
