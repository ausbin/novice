import { Hashable } from './objset';

interface Production<NT, T> {
    lhs: NT;
    rhs: (T|NT)[];
}

export { Production };
