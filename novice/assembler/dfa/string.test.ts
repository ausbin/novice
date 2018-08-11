import StringDFA from './string';
import { feedDFA } from './helpers.test';

describe('string DFA', () => {
    let dfa: StringDFA;

    beforeEach(() => {
        dfa = new StringDFA();
    });

    it('rejects raw text', () => {
        const len = feedDFA(dfa, '', 'gwen"');
        expect(dfa.getAcceptingLength()).toBe(len);
        expect(dfa.isAlive()).toBe(false);
    });

    describe('strings', () => {
        it('rejects unclosed empty string', () => {
            const len = feedDFA(dfa, '', '"');
            expect(dfa.getAcceptingLength()).toBe(len);
            expect(dfa.isAlive()).toBe(true);
        });

        it('rejects unclosed string', () => {
            const len = feedDFA(dfa, '', '"kitty');
            expect(dfa.getAcceptingLength()).toBe(len);
            expect(dfa.isAlive()).toBe(true);
        });

        it('rejects unclosed string ending with backslash', () => {
            const len = feedDFA(dfa, '', '"kitty\\');
            expect(dfa.getAcceptingLength()).toBe(len);
            expect(dfa.isAlive()).toBe(true);
        });

        it('recognizes empty string', () => {
            const len = feedDFA(dfa, '""', '   ');
            expect(dfa.getAcceptingLength()).toBe(len);
            expect(dfa.isAlive()).toBe(false);
            expect(dfa.getKind()).toEqual('string');
        });

        it('dies at closing quote', () => {
            const len = feedDFA(dfa, '""');
            expect(dfa.getAcceptingLength()).toBe(len);
            expect(dfa.isAlive()).toBe(false);
            expect(dfa.getKind()).toEqual('string');
        });

        it('recognizes nonempty string', () => {
            const len = feedDFA(dfa, '"trevor"', ' ');
            expect(dfa.getAcceptingLength()).toBe(len);
            expect(dfa.isAlive()).toBe(false);
            expect(dfa.getKind()).toEqual('string');
        });

        it('dies at closing quote of nonempty string', () => {
            const len = feedDFA(dfa, '"trevor"');
            expect(dfa.getAcceptingLength()).toBe(len);
            expect(dfa.isAlive()).toBe(false);
            expect(dfa.getKind()).toEqual('string');
        });

        it('recognizes escapes', () => {
            const len = feedDFA(dfa, '"\\n"');
            expect(dfa.getAcceptingLength()).toBe(len);
            expect(dfa.isAlive()).toBe(false);
            expect(dfa.getKind()).toEqual('string');
        });

        it('recognizes intermixed escapes', () => {
            const len = feedDFA(dfa, '"hello\\ni am bob"');
            expect(dfa.getAcceptingLength()).toBe(len);
            expect(dfa.isAlive()).toBe(false);
            expect(dfa.getKind()).toEqual('string');
        });

        it('recognizes escaped double quote', () => {
            const len = feedDFA(dfa, '"hi\\"mom"', ' ');
            expect(dfa.getAcceptingLength()).toBe(len);
            expect(dfa.isAlive()).toBe(false);
            expect(dfa.getKind()).toEqual('string');
        });

        it('recognizes lonely escaped double quote', () => {
            const len = feedDFA(dfa, '"\\""');
            expect(dfa.getAcceptingLength()).toBe(len);
            expect(dfa.isAlive()).toBe(false);
            expect(dfa.getKind()).toEqual('string');
        });
    });

    describe('chars', () => {
        it('rejects unclosed empty char literal', () => {
            const len = feedDFA(dfa, '', "'");
            expect(dfa.getAcceptingLength()).toBe(len);
            expect(dfa.isAlive()).toBe(true);
        });

        it('rejects unclosed char literal', () => {
            const len = feedDFA(dfa, '', "'a");
            expect(dfa.getAcceptingLength()).toBe(len);
            expect(dfa.isAlive()).toBe(true);
        });

        it('rejects empty char literal', () => {
            const len = feedDFA(dfa, '', "''");
            expect(dfa.getAcceptingLength()).toBe(len);
            expect(dfa.isAlive()).toBe(false);
        });

        it('rejects char literal with multiple characters', () => {
            const len = feedDFA(dfa, '', "'ab");
            expect(dfa.getAcceptingLength()).toBe(len);
            expect(dfa.isAlive()).toBe(false);
        });

        it('rejects unclosed char literal ending with backslash', () => {
            const len = feedDFA(dfa, '', "'\\");
            expect(dfa.getAcceptingLength()).toBe(len);
            expect(dfa.isAlive()).toBe(true);
        });

        it('recognizes character literals', () => {
            const len = feedDFA(dfa, "'a'");
            expect(dfa.getAcceptingLength()).toBe(len);
            expect(dfa.isAlive()).toBe(false);
            expect(dfa.getKind()).toEqual('char');
        });

        it('recognizes escapes in character literals', () => {
            const len = feedDFA(dfa, "'\\n'");
            expect(dfa.getAcceptingLength()).toBe(len);
            expect(dfa.isAlive()).toBe(false);
            expect(dfa.getKind()).toEqual('char');
        });

        it('recognizes escaped single quote in character literals', () => {
            const len = feedDFA(dfa, "'\\''");
            expect(dfa.getAcceptingLength()).toBe(len);
            expect(dfa.isAlive()).toBe(false);
            expect(dfa.getKind()).toEqual('char');
        });
    });
});