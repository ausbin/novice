import CommentDFA from './comment';
import { feedDFA } from './helpers.test';

type T = 'farzam'|'chen';

describe('comment DFA', () => {
    let dfa: CommentDFA<T>;

    beforeEach(() => {
        dfa = new CommentDFA<T>(['#', ';']);
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
        expect(dfa.getT()).toBe(null);
    });

    it('recognizes # comments', () => {
        const len = feedDFA(dfa, '#  end gaming today');
        expect(dfa.getAcceptingLength()).toBe(len);
        expect(dfa.isAlive()).toBe(true);
        expect(dfa.getT()).toBe(null);
    });

    it('recognizes empty comments', () => {
        const len = feedDFA(dfa, ';');
        expect(dfa.getAcceptingLength()).toBe(len);
        expect(dfa.isAlive()).toBe(true);
        expect(dfa.getT()).toBe(null);
    });
});
