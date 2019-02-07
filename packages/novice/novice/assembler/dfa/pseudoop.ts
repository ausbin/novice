import { DFA } from './dfa';
import { isWordChar } from './lex';

enum State {
    Start,
    GotDot,
}

interface PseudoOpTs<T> {
    pseudoOp: T;
}

export default class PseudoOpDFA<T> extends DFA<T> {
    private Ts: PseudoOpTs<T>;
    private state!: State;
    private alive!: boolean;
    private length!: number;
    private acceptingLength!: number;

    public constructor(Ts: PseudoOpTs<T>) {
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
        switch (this.state) {
            case State.Start:
                if (c === '.') {
                    this.state = State.GotDot;
                } else {
                    this.alive = false;
                }
                break;
            case State.GotDot:
                if (isText) {
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
        return this.Ts.pseudoOp;
    }
}
