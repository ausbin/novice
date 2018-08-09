import CommentDFA from './comment';
import { feedDFA } from './helpers.test';

describe('comment DFA', () => {
    let dfa: CommentDFA;

    beforeEach(() => {
        dfa = new CommentDFA();
    });

    it('is not a token', () => {
        expect(dfa.isToken()).toBe(false);
    });

    it('rejects text without ; or #', () => {
        const len = feedDFA(dfa, '', 'this is a comment');
        expect(dfa.getAcceptingLength()).toBe(len);
        expect(dfa.isAlive()).toBe(false);
    });

    it('rejects strings', () => {
        const len = feedDFA(dfa, '', '"; something"');
        expect(dfa.getAcceptingLength()).toBe(len);
        expect(dfa.isAlive()).toBe(false);
    });

    it('recognizes ; comments', () => {
        const len = feedDFA(dfa, '; hello');
        expect(dfa.getAcceptingLength()).toBe(len);
        expect(dfa.isAlive()).toBe(true);
    });

    it('recognizes # comments', () => {
        const len = feedDFA(dfa, '#  end gaming today');
        expect(dfa.getAcceptingLength()).toBe(len);
        expect(dfa.isAlive()).toBe(true);
    });

    it('recognizes empty comments', () => {
        const len = feedDFA(dfa, ';');
        expect(dfa.getAcceptingLength()).toBe(len);
        expect(dfa.isAlive()).toBe(true);
    });
});
