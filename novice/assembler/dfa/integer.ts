import DFA from './dfa';

enum State {
    Start,
    Decimal,
    Hexadecimal,
}

export default class IntegerDFA extends DFA {
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
        const isDecimalDigit =
            charCode >= '0'.charCodeAt(0) && charCode <= '9'.charCodeAt(0);
        const isHexDigit = isDecimalDigit ||
            charCode >= 'a'.charCodeAt(0) && charCode <= 'z'.charCodeAt(0) ||
            charCode >= 'A'.charCodeAt(0) && charCode <= 'Z'.charCodeAt(0);

        switch (this.state) {
            case State.Start:
                if (c.toLowerCase() === 'x') {
                    this.state = State.Hexadecimal;
                } else if (isDecimalDigit) {
                    this.state = State.Decimal;
                    this.acceptingLength = this.length;
                } else if (c.toLowerCase() === 'r') {
                    this.state = State.Decimal;
                } else {
                    this.alive = false;
                }
                break;
            case State.Hexadecimal:
                if (isHexDigit) {
                    this.acceptingLength = this.length;
                } else {
                    this.alive = false;
                }
                break;
            case State.Decimal:
                if (isDecimalDigit) {
                    this.acceptingLength = this.length;
                } else {
                    this.alive = false;
                }
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
