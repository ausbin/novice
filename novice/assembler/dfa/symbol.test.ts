import SymbolDFA from './symbol';
import { feedDFA } from './helpers.test';

describe('symbol DFA', () => {
    let dfa: SymbolDFA;

    beforeEach(() => {
        dfa = new SymbolDFA();
    });

    it('is a token', () => {
        expect(dfa.isToken()).toBe(true);
    });

    it('rejects unknown symbols', () => {
        const len = feedDFA(dfa, '', '^ asdfasdf');
        expect(dfa.getAcceptingLength()).toBe(len);
        expect(dfa.isAlive()).toBe(false);
    });

    it('recognizes ,', () => {
        const len = feedDFA(dfa, ',', 'r0');
        expect(dfa.getAcceptingLength()).toBe(len);
        expect(dfa.isAlive()).toBe(false);
    });

    it('dies after ,', () => {
        const len = feedDFA(dfa, ',');
        expect(dfa.getAcceptingLength()).toBe(len);
        expect(dfa.isAlive()).toBe(false);
    });

    it('recognizes (', () => {
        const len = feedDFA(dfa, '(', 'r0');
        expect(dfa.getAcceptingLength()).toBe(len);
        expect(dfa.isAlive()).toBe(false);
    });

    it('recognizes )', () => {
        const len = feedDFA(dfa, ')');
        expect(dfa.getAcceptingLength()).toBe(len);
        expect(dfa.isAlive()).toBe(false);
    });
});
