export default abstract class DFA {
    public abstract feed(c: string): void;
    public abstract isAlive(): boolean;
    public abstract getAcceptingLength(): number;
    public abstract reset(): void;

    public isToken(): boolean {
        return true;
    }
}
