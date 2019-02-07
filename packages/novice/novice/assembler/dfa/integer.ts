import { DFA } from './dfa';
import { isDecimalDigit, isHexDigit } from './lex';

enum State {
    Start,
    GotZero,
    Decimal,
    Hexadecimal,
}

interface IntegerTs<T> {
    hex: T;
    dec: T;
}

export default class IntegerDFA<T> extends DFA<T> {
    private Ts: IntegerTs<T>;
    private noHexZeroPrefix: boolean;
    private state!: State;
    private alive!: boolean;
    private length!: number;
    private acceptingLength!: number;
    private terminal!: T;

    public constructor(Ts: IntegerTs<T>, noHexZeroPrefix?: boolean) {
        super();
        this.Ts = Ts;
        this.noHexZeroPrefix = !!noHexZeroPrefix;
        this.reset();
    }

    public feed(c: string): void {
        if (!this.alive) {
            return;
        }

        this.length++;

        switch (this.state) {
            case State.Start:
                if (this.noHexZeroPrefix && c.toLowerCase() === 'x') {
                    this.state = State.Hexadecimal;
                } else if (isDecimalDigit(c)) {
                    if (!this.noHexZeroPrefix && c === '0') {
                        this.state = State.GotZero;
                    } else {
                        this.state = State.Decimal;
                    }
                    this.acceptingLength = this.length;
                    this.terminal = this.Ts.dec;
                } else if (c === '-') {
                    this.state = State.Decimal;
                    this.terminal = this.Ts.dec;
                } else {
                    this.alive = false;
                }
                break;
            // If we're in this state, we know !this.noHexPrefix
            case State.GotZero:
                if (c.toLowerCase() === 'x') {
                    // Don't bump acceptingLength because 0x is nonsense
                    // Don't set this.terminal in case 0 gets accepted on
                    // its own
                    this.state = State.Hexadecimal;
                } else if (isDecimalDigit(c)) {
                    this.acceptingLength = this.length;
                } else {
                    this.alive = false;
                }
                break;
            case State.Hexadecimal:
                if (isHexDigit(c)) {
                    this.terminal = this.Ts.hex;
                    this.acceptingLength = this.length;
                } else {
                    this.alive = false;
                }
                break;
            case State.Decimal:
                if (isDecimalDigit(c)) {
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

    public getT(): T {
        return this.terminal;
    }
}
