import { DFA } from './dfa';

enum State {
    Start,
    Comment,
}

export default class CommentDFA<T> extends DFA<T> {
    private commentChars: string[];
    private state!: State;
    private alive!: boolean;
    private length!: number;
    private acceptingLength!: number;

    public constructor(commentChars: string[]) {
        super();
        this.commentChars = commentChars;
        this.reset();
    }

    public feed(c: string): void {
        if (!this.alive) {
            return;
        }

        this.length++;

        switch (this.state) {
            case State.Start:
                if (this.commentChars.indexOf(c) !== -1) {
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

    public getT(): null {
        return null;
    }
}
