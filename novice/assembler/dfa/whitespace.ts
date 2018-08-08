import DFA from './dfa';

export default class WhitespaceDFA extends DFA {
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

        switch (c) {
            case ' ':
            case '\t':
                this.acceptingLength = this.length;
                break;
            default:
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

    public isToken(): boolean {
        return false;
    }
}
