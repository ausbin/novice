import { DFA } from './dfa';

function feedDFA(dfa: DFA, str: string, follow?: string): number {
    let food = follow? str + follow : str;

    for (let i = 0; i < food.length; i++) {
        dfa.feed(food.charAt(i));
    }
    return str.length;
}

export { feedDFA }
