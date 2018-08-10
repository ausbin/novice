import { isWordChar } from '../lex';
import { DFA, Kind } from './dfa';

export default class WordDFA extends DFA {
    private alive!: boolean;
    private length!: number;
    private acceptingLength!: number;

    public constructor() {
        super();
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

    public getKind(): Kind {
        return 'word';
    }
}
