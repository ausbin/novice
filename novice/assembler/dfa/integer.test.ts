import IntegerDFA from './integer';
import { feedDFA } from './helpers.test';

describe('integer DFA', () => {
    let dfa: IntegerDFA;

    beforeEach(() => {
        dfa = new IntegerDFA();
    });

    it('is a token', () => {
        expect(dfa.isToken()).toBe(true);
    });

    it('rejects raw hex digits', () => {
        const len = feedDFA(dfa, '', 'abc');
        expect(dfa.getAcceptingLength()).toBe(len);
        expect(dfa.isAlive()).toBe(false);
    });

    it('rejects decimal numbers with hex digits', () => {
        const len = feedDFA(dfa, '123', 'adf');
        expect(dfa.getAcceptingLength()).toBe(len);
        expect(dfa.isAlive()).toBe(false);
    });

    it('rejects invalid hex numbers', () => {
        const len = feedDFA(dfa, 'xbeef', 'y');
        expect(dfa.getAcceptingLength()).toBe(len);
        expect(dfa.isAlive()).toBe(false);
    });

    it('recognizes hex literals', () => {
        const len = feedDFA(dfa, 'xbeef');
        expect(dfa.getAcceptingLength()).toBe(len);
        expect(dfa.isAlive()).toBe(true);
    });

    it('recognizes capitalized hex literals', () => {
        const len = feedDFA(dfa, 'XBEeeeF');
        expect(dfa.getAcceptingLength()).toBe(len);
        expect(dfa.isAlive()).toBe(true);
    });

    it('recognizes decimal numbers', () => {
        const len = feedDFA(dfa, '69');
        expect(dfa.getAcceptingLength()).toBe(len);
        expect(dfa.isAlive()).toBe(true);
    });

    it('recognizes registers', () => {
        const len = feedDFA(dfa, 'r0');
        expect(dfa.getAcceptingLength()).toBe(len);
        expect(dfa.isAlive()).toBe(true);
    });
});
