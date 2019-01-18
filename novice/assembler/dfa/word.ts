import { DFA } from './dfa';
import { isWordChar } from './lex';

interface WordTs<T> {
    word: T;
}

export default class WordDFA<T> extends DFA<T> {
    private Ts: WordTs<T>;
    private alive!: boolean;
    private length!: number;
    private acceptingLength!: number;

    public constructor(Ts: WordTs<T>) {
        super();
        this.Ts = Ts;
        this.reset();
    }

    public feed(c: string): void {
        if (!this.alive) {
            return;
        }

        this.length++;

        const isText = isWordChar(c);
        if (isText) {
            this.acceptingLength = this.length;
        } else {
            this.alive = false;
        }
    }

    public isAlive(): boolean {
        return this.alive;
    }

    public getAcceptingLength(): number {
        return this.acceptingLength;
    }

    public reset(): void {
        this.alive = true;
        this.length = 0;
        this.acceptingLength = 0;
    }

    public getT(): T {
        return this.Ts.word;
    }
}
