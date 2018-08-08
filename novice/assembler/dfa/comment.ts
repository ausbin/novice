import DFA from './dfa';

enum State {
    Start,
    Comment,
}

export default class CommentDFA extends DFA {
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

        switch (this.state) {
            case State.Start:
                if (c === ';' || c === '#') {
                    this.state = State.Comment;
                    this.acceptingLength = this.length;
                } else {
                    this.alive = false;
                }
                break;
            case State.Comment:
                // Take anything
                this.acceptingLength = this.length;
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

    public isToken(): boolean {
        return false;
    }
}
