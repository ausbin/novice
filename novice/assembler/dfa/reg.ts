import { DFA } from './dfa';
import { isDecimalDigit, isWordChar } from './lex';

enum State {
    Start,
    Regno,
}

interface RegTs<T> {
    reg: T;
}

export default class RegDFA<T> extends DFA<T> {
    private Ts: RegTs<T>;
    private prefixes: string[];
    private hasAliases: boolean;
    private state!: State;
    private alive!: boolean;
    private length!: number;
    private acceptingLength!: number;

    public constructor(Ts: RegTs<T>, prefixes: string[], hasAliases?: boolean) {
        super();
        this.Ts = Ts;
        this.prefixes = prefixes;
        this.hasAliases = !!hasAliases;
        this.reset();
    }

    public feed(c: string): void {
        if (!this.alive) {
            return;
        }

        this.length++;

        switch (this.state) {
            case State.Start:
                if (this.prefixes.indexOf(c.toLowerCase()) !== -1) {
                    this.state = State.Regno;
                } else {
                    this.alive = false;
                }
                break;
            case State.Regno:
                if (isDecimalDigit(c) || this.hasAliases && isWordChar(c)) {
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
        return this.Ts.reg;
    }
}
