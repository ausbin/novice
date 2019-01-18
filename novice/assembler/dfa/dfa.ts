abstract class DFA<T> {
    public abstract feed(c: string): void;
    public abstract isAlive(): boolean;
    public abstract getAcceptingLength(): number;
    public abstract reset(): void;
    public abstract getT(): T | null;
}

export { DFA };
