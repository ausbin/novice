import SymbolDFA from './symbol';
import { feedDFA } from './helpers.test';

type T = ','|'('|')'|':'|'asdfasdf';

describe('symbol DFA', () => {
    let dfa: SymbolDFA<T>;

    beforeEach(() => {
        dfa = new SymbolDFA<T>([',', '(', ')', ':']);
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
        expect(dfa.getT()).toEqual(',');
    });

    it('dies after ,', () => {
        const len = feedDFA(dfa, ',');
        expect(dfa.getAcceptingLength()).toBe(len);
        expect(dfa.isAlive()).toBe(false);
        expect(dfa.getT()).toEqual(',');
    });

    it('recognizes (', () => {
        const len = feedDFA(dfa, '(', 'r0');
        expect(dfa.getAcceptingLength()).toBe(len);
        expect(dfa.isAlive()).toBe(false);
        expect(dfa.getT()).toEqual('(');
    });

    it('recognizes )', () => {
        const len = feedDFA(dfa, ')');
        expect(dfa.getAcceptingLength()).toBe(len);
        expect(dfa.isAlive()).toBe(false);
        expect(dfa.getT()).toEqual(')');
    });

    it('recognizes :', () => {
        const len = feedDFA(dfa, ':');
        expect(dfa.getAcceptingLength()).toBe(len);
        expect(dfa.isAlive()).toBe(false);
        expect(dfa.getT()).toEqual(':');
    });
});
