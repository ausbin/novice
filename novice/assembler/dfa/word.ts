import DFA from './dfa';

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

        const charCode = c.charCodeAt(0);
        const isText = c === '_' || c === '-' ||
            charCode >= 'a'.charCodeAt(0) && charCode <= 'z'.charCodeAt(0) ||
            charCode >= 'A'.charCodeAt(0) && charCode <= 'Z'.charCodeAt(0);

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
}
