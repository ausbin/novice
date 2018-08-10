import PseudoOpDFA from './pseudoop';
import { feedDFA } from './helpers.test';

describe('pseudo-op DFA', () => {
    let dfa: PseudoOpDFA;

    beforeEach(() => {
        dfa = new PseudoOpDFA();
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
        expect(dfa.getKind()).toEqual('pseudoop');
    });
});
