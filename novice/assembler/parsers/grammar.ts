import { Kind as T, kinds as Ts } from '../dfa';
import { Production } from '../lr1';

interface Grammar<NT> {
    NTs: Set<NT>;
    productions: Production<NT, T>[];
    goal: NT;
}

export { Grammar, T, Ts };
