import { isDecimalDigit, isHexDigit } from '../lex';
import { DFA, Kind } from './dfa';

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
    private kind!: Kind;

    public constructor() {
        super();
        this.reset();
    }

    public feed(c: string): void {
        if (!this.alive) {
            return;
        }

        this.length++;

        switch (this.state) {
            case State.Start:
                if (c.toLowerCase() === 'x') {
                    this.state = State.Hexadecimal;
                    this.kind = 'int-hex';
                } else if (isDecimalDigit(c)) {
                    this.state = State.Decimal;
                    this.acceptingLength = this.length;
                    this.kind = 'int-decimal';
                } else if (c === '-') {
                    this.state = State.Decimal;
                    this.kind = 'int-decimal';
                } else if (c.toLowerCase() === 'r') {
                    this.state = State.Decimal;
                    this.kind = 'reg';
                } else {
                    this.alive = false;
                }
                break;
            case State.Hexadecimal:
                if (isHexDigit(c)) {
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

    public getKind(): Kind {
        return this.kind;
    }
}
