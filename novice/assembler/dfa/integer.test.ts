import IntegerDFA from './integer';
import { feedDFA } from './helpers.test';

describe('integer DFA', () => {
    let dfa: IntegerDFA;

    beforeEach(() => {
        dfa = new IntegerDFA();
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

    it('rejects lonely dashes', () => {
        const len = feedDFA(dfa, '', '-');
        expect(dfa.getAcceptingLength()).toBe(len);
        expect(dfa.isAlive()).toBe(true);
    });

    it('rejects signed hex', () => {
        const len = feedDFA(dfa, '', '-xbeef');
        expect(dfa.getAcceptingLength()).toBe(len);
        expect(dfa.isAlive()).toBe(false);
    });

    it('rejects signed registers', () => {
        const len = feedDFA(dfa, '', 'r-2');
        expect(dfa.getAcceptingLength()).toBe(len);
        expect(dfa.isAlive()).toBe(false);
    });

    it('recognizes hex literals', () => {
        const len = feedDFA(dfa, 'xbeef');
        expect(dfa.getAcceptingLength()).toBe(len);
        expect(dfa.isAlive()).toBe(true);
        expect(dfa.getKind()).toEqual('int-hex');
    });

    it('recognizes capitalized hex literals', () => {
        const len = feedDFA(dfa, 'XBEeeeF');
        expect(dfa.getAcceptingLength()).toBe(len);
        expect(dfa.isAlive()).toBe(true);
        expect(dfa.getKind()).toEqual('int-hex');
    });

    it('recognizes decimal numbers', () => {
        const len = feedDFA(dfa, '69');
        expect(dfa.getAcceptingLength()).toBe(len);
        expect(dfa.isAlive()).toBe(true);
        expect(dfa.getKind()).toEqual('int-decimal');
    });

    it('recognizes negative decimal numbers', () => {
        const len = feedDFA(dfa, '-69', 'banana');
        expect(dfa.getAcceptingLength()).toBe(len);
        expect(dfa.isAlive()).toBe(false);
        expect(dfa.getKind()).toEqual('int-decimal');
    });

    it('recognizes registers', () => {
        const len = feedDFA(dfa, 'r0');
        expect(dfa.getAcceptingLength()).toBe(len);
        expect(dfa.isAlive()).toBe(true);
        expect(dfa.getKind()).toEqual('reg');
    });
});
