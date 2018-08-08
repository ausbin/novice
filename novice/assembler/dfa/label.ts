import DFA from './dfa';

enum State {
    Start,
    GotText,
    GotColon,
}

export default class LabelDFA extends DFA {
    private state!: State;
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

        switch (this.state) {
            case State.Start:
                if (isText) {
                    this.state = State.GotText;
                } else {
                    this.alive = false;
                }
                break;
            case State.GotText:
                if (isText) {
                    // cool
                } else if (c === ':') {
                    this.acceptingLength = this.length;
                    this.state = State.GotColon;
                } else {
                    this.alive = false;
                }
                break;
            case State.GotColon:
                this.alive = false;
                break;
        }
    }

    public isAlive(): boolean {
        return this.alive;
    }

    public getAcceptingLength(): number {
        return this.acceptingLength;
    }

    public reset(): void {
        this.state = State.Start;
        this.alive = true;
        this.length = 0;
        this.acceptingLength = 0;
    }
}
