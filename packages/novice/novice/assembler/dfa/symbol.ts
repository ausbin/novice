import { DFA } from './dfa';

export default class SymbolDFA<T> extends DFA<T> {
    private Ts: {[s: string]: T};
    private alive!: boolean;
    private acceptingLength!: number;
    private kind!: T;

    public constructor(symbols: T[]) {
        super();

        this.Ts = {};
        // Hack to get around the type checker
        for (const symbol of symbols) {
            this.Ts[symbol.toString()] = symbol;
        }

        this.reset();
    }

    public feed(c: string): void {
        if (!this.alive) {
            return;
        }

        if (c in this.Ts) {
            this.acceptingLength = 1;
            this.kind = this.Ts[c];
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
