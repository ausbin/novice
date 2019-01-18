import { DFA } from './dfa';

enum State {
    Start,
    String,
    StringEscape,
    Character,
    CharacterEscape,
    CharacterGotten,
}

interface StringTs<T> {
    string: T;
    char: T;
}

export default class StringDFA<T> extends DFA<T> {
    private Ts: StringTs<T>;
    private state!: State;
    private alive!: boolean;
    private length!: number;
    private acceptingLength!: number;
    private kind!: T;

    public constructor(Ts: StringTs<T>) {
        super();
        this.Ts = Ts;
        this.reset();
    }

    public feed(c: string): void {
        if (!this.alive) {
            return;
        }

        this.length++;

        switch (this.state) {
            case State.Start:
                switch (c) {
                    case '"':
                        this.state = State.String;
                        this.kind = this.Ts.string;
                        break;
                    case "'":
                        this.state = State.Character;
                        this.kind = this.Ts.char;
                        break;
                    default:
                        this.alive = false;
                }
                break;
            case State.String:
                switch (c) {
                    case '"':
                        this.acceptingLength = this.length;
                        this.alive = false;
                        break;
                    case '\\':
                        this.state = State.StringEscape;
                        break;
                    default:
                        // gobble gobble
                        break;
                }
                break;
            case State.StringEscape:
                // gobble this character, who cares what it is
                this.state = State.String;
                break;
            case State.Character:
                switch (c) {
                    case "'":
                        // Empty, like ''. This is invalid.
                        this.alive = false;
                        break;
                    case '\\':
                        this.state = State.CharacterEscape;
                        break;
                    default:
                        this.state = State.CharacterGotten;
                        break;
                }
                break;
            case State.CharacterEscape:
                // gobble this character, who cares what it is
                this.state = State.CharacterGotten;
                break;
            case State.CharacterGotten:
                switch (c) {
                    case "'":
                        this.acceptingLength = this.length;
                        this.alive = false;
                        break;
                    default:
                        // not a single character
                        this.alive = false;
                        break;
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
        return this.kind;
    }
}
