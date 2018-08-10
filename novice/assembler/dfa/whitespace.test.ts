import WhitespaceDFA from './whitespace';
import { feedDFA } from './helpers.test';

describe('whitespace DFA', () => {
    let dfa: WhitespaceDFA;

    beforeEach(() => {
        dfa = new WhitespaceDFA();
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
        expect(dfa.getKind()).toBe(null);
    });

    it('recognizes tabs', () => {
        const len = feedDFA(dfa, '\t');
        expect(dfa.getAcceptingLength()).toBe(len);
        expect(dfa.isAlive()).toBe(true);
        expect(dfa.getKind()).toBe(null);
    });

    it('recognizes intermixed whitespace', () => {
        const len = feedDFA(dfa, '  \t  \t\t \t \t', 'halt');
        expect(dfa.getAcceptingLength()).toBe(len);
        expect(dfa.isAlive()).toBe(false);
        expect(dfa.getKind()).toBe(null);
    });
});
