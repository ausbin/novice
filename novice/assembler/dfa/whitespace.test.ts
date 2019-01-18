import WhitespaceDFA from './whitespace';
import { feedDFA } from './helpers.test';

type T = 'big'|'daddy';

describe('whitespace DFA', () => {
    let dfa: WhitespaceDFA<T>;

    beforeEach(() => {
        dfa = new WhitespaceDFA<T>();
    });

    it('rejects text', () => {
        const len = feedDFA(dfa, '', 'bob');
        expect(dfa.getAcceptingLength()).toBe(len);
        expect(dfa.isAlive()).toBe(false);
    });

    it('recognizes spaces', () => {
        const len = feedDFA(dfa, '        ');
        expect(dfa.getAcceptingLength()).toBe(len);
        expect(dfa.isAlive()).toBe(true);
        expect(dfa.getT()).toBe(null);
    });

    it('recognizes tabs', () => {
        const len = feedDFA(dfa, '\t');
        expect(dfa.getAcceptingLength()).toBe(len);
        expect(dfa.isAlive()).toBe(true);
        expect(dfa.getT()).toBe(null);
    });

    it('recognizes intermixed whitespace', () => {
        const len = feedDFA(dfa, '  \t  \t\t \t \t', 'halt');
        expect(dfa.getAcceptingLength()).toBe(len);
        expect(dfa.isAlive()).toBe(false);
        expect(dfa.getT()).toBe(null);
    });
});
