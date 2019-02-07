import WordDFA from './word';
import { feedDFA } from './helpers.test';

type T = 'word';

describe('word DFA', () => {
    let dfa: WordDFA<T>;

    beforeEach(() => {
        dfa = new WordDFA<T>({word: 'word'});
    });

    it('rejects nonsense', () => {
        const len = feedDFA(dfa, '', '^ woweee');
        expect(dfa.getAcceptingLength()).toBe(len);
        expect(dfa.isAlive()).toBe(false);
    });

    it('rejects label', () => {
        const len = feedDFA(dfa, 'woweee', ': halt');
        expect(dfa.getAcceptingLength()).toBe(len);
        expect(dfa.isAlive()).toBe(false);
    });

    it('recognizes word', () => {
        const len = feedDFA(dfa, 'add', ' r0, r0, r1');
        expect(dfa.getAcceptingLength()).toBe(len);
        expect(dfa.isAlive()).toBe(false);
        expect(dfa.getT()).toEqual('word');
    });

    it('recognizes word with digits', () => {
        const len = feedDFA(dfa, 'mylabel2', ': add r0, r0, r1');
        expect(dfa.getAcceptingLength()).toBe(len);
        expect(dfa.isAlive()).toBe(false);
        expect(dfa.getT()).toEqual('word');
    });
});
