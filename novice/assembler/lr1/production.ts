import { Hashable } from './objset';

class Production<NT, T> implements Hashable {
    public lhs: NT;
    public rhs: (T|NT)[];

    public constructor(lhs: NT, rhs: (T|NT)[]) {
        this.lhs = lhs;
        this.rhs = rhs;
    }

    public toString(): string {
        return `${this.lhs} -> ${this.rhs.join(' ')}`;
    }

    public hash(): string {
        return this.toString();
    }
}

export { Production };
