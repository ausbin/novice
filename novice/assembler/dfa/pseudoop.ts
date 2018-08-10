import { isWordChar } from '../lex';
import { DFA, Kind } from './dfa';

enum State {
    Start,
    GotDot,
}

export default class PseudoOpDFA extends DFA {
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

    public getKind(): Kind {
        return 'pseudoop';
    }
}
