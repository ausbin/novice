import IntegerDFA from './integer';
import { feedDFA } from './helpers.test';

type T = 'int-decimal'|'int-hex';

describe('integer DFA', () => {
    let dfa: IntegerDFA;

    describe('noHexZeroPrefix = true', () => {
        beforeEach(() => {
            dfa = new IntegerDFA<T>({hex: 'int-hex', dec: 'int-decimal'}, true);
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

        it('recognizes hex literals', () => {
            const len = feedDFA(dfa, 'xbeef');
            expect(dfa.getAcceptingLength()).toBe(len);
            expect(dfa.isAlive()).toBe(true);
            expect(dfa.getT()).toEqual('int-hex');
        });

        it('recognizes capitalized hex literals', () => {
            const len = feedDFA(dfa, 'XBEeeeF');
            expect(dfa.getAcceptingLength()).toBe(len);
            expect(dfa.isAlive()).toBe(true);
            expect(dfa.getT()).toEqual('int-hex');
        });

        it('recognizes decimal numbers', () => {
            const len = feedDFA(dfa, '69');
            expect(dfa.getAcceptingLength()).toBe(len);
            expect(dfa.isAlive()).toBe(true);
            expect(dfa.getT()).toEqual('int-decimal');
        });

        it('recognizes negative decimal numbers', () => {
            const len = feedDFA(dfa, '-69', 'banana');
            expect(dfa.getAcceptingLength()).toBe(len);
            expect(dfa.isAlive()).toBe(false);
            expect(dfa.getT()).toEqual('int-decimal');
        });
    });

    describe('noHexZeroPrefix = false', () => {
        beforeEach(() => {
            dfa = new IntegerDFA({hex: 'int-hex', dec: 'int-decimal'});
        });

        it('rejects hex numbers without leading 0', () => {
            const len = feedDFA(dfa, '', 'xbeef');
            expect(dfa.getAcceptingLength()).toBe(len);
            expect(dfa.isAlive()).toBe(false);
        });

        it('recognizes hex literals with leading 0', () => {
            const len = feedDFA(dfa, '0xbeef');
            expect(dfa.getAcceptingLength()).toBe(len);
            expect(dfa.isAlive()).toBe(true);
            expect(dfa.getT()).toEqual('int-hex');
        });

        it('recognizes lonely 0s', () => {
            const len = feedDFA(dfa, '0');
            expect(dfa.getAcceptingLength()).toBe(len);
            expect(dfa.isAlive()).toBe(true);
            expect(dfa.getT()).toEqual('int-decimal');
        });

        it('recognizes lonely 0x as 0', () => {
            const len = feedDFA(dfa, '0', 'x');
            expect(dfa.getAcceptingLength()).toBe(len);
            expect(dfa.isAlive()).toBe(true);
            expect(dfa.getT()).toEqual('int-decimal');
        });
    });
});
