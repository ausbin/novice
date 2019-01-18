import PseudoOpDFA from './pseudoop';
import { feedDFA } from './helpers.test';

type T = 'pseudo-op';

describe('pseudo-op DFA', () => {
    let dfa: PseudoOpDFA<T>;

    beforeEach(() => {
        dfa = new PseudoOpDFA<T>({pseudoOp: 'pseudo-op'});
    });

    it('rejects nonsense', () => {
        const len = feedDFA(dfa, '', '^.fill');
        expect(dfa.getAcceptingLength()).toBe(len);
        expect(dfa.isAlive()).toBe(false);
    });

    it('rejects nonsense after dot', () => {
        const len = feedDFA(dfa, '', '.^fill');
        expect(dfa.getAcceptingLength()).toBe(len);
        expect(dfa.isAlive()).toBe(false);
    });

    it('recognizes pseudo-op', () => {
        const len = feedDFA(dfa, '.fill', ' xBEEF');
        expect(dfa.getAcceptingLength()).toBe(len);
        expect(dfa.isAlive()).toBe(false);
        expect(dfa.getT()).toEqual('pseudo-op');
    });
});
