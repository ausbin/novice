import { DFA } from './dfa';

export default class SymbolDFA<T extends string> extends DFA<T> {
    private Ts: Set<string>;
    private alive!: boolean;
    private acceptingLength!: number;
    private kind!: T;

    public constructor(symbols: T[]) {
        super();

        this.Ts = new Set<string>(symbols);

        this.reset();
    }

    public feed(c: string): void {
        if (!this.alive) {
            return;
        }

        if (this.Ts.has(c)) {
            this.acceptingLength = 1;
            this.kind = c as T;
        }

        this.alive = false;
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

    public getT(): T {
        return this.kind;
    }
}
