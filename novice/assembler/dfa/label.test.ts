import LabelDFA from './label';
import { feedDFA } from './helpers.test';

describe('label DFA', () => {
    let dfa: LabelDFA;

    beforeEach(() => {
        dfa = new LabelDFA();
    });

    it('is a token', () => {
        expect(dfa.isToken()).toBe(true);
    });

    it('rejects nonsense', () => {
        const len = feedDFA(dfa, '', '^ woweee');
        expect(dfa.getAcceptingLength()).toBe(len);
        expect(dfa.isAlive()).toBe(false);
    });

    it('rejects ending in nonsense', () => {
        const len = feedDFA(dfa, '', 'woweee^: halt');
        expect(dfa.getAcceptingLength()).toBe(len);
        expect(dfa.isAlive()).toBe(false);
    });

    it('rejects word without :', () => {
        const len = feedDFA(dfa, '', 'margaret');
        expect(dfa.getAcceptingLength()).toBe(len);
        expect(dfa.isAlive()).toBe(true);
    });

    it('recognizes word with :', () => {
        const len = feedDFA(dfa, 'bob:', ' add r0, r0, r1');
        expect(dfa.getAcceptingLength()).toBe(len);
        expect(dfa.isAlive()).toBe(false);
    });
});
