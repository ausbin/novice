import { DFA, Kind } from './dfa';

export default class SymbolDFA extends DFA {
    private alive!: boolean;
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

        switch (c) {
            case '(':
            case ')':
            case ',':
            case ':':
                this.acceptingLength = 1;
                this.kind = c;
            default:
                this.alive = false;
        }
    }

    public isAlive(): boolean {
        return this.alive;
    }

    public getAcceptingLength(): number {
        return this.acceptingLength;
    }

    public reset(): void {
        this.alive = true;
        this.acceptingLength = 0;
    }

    public getKind(): Kind {
        return this.kind;
    }
}
