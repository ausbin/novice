import { Hashable, ObjSet } from './objset';
import { Production } from './production';

type S = '' | 'eof';

class ParseItem<NT, T> implements Hashable {
    public production: Production<NT, T>;
    public stacktop: number;
    public lookahead: S|T;

    public constructor(production: Production<NT, T>, stacktop: number,
                       lookahead: S|T) {
        this.production = production;
        this.stacktop = stacktop;
        this.lookahead = lookahead;
    }

    public hash(): string {
        return `[${this.production.hash()}, ${this.stacktop}, ${this.lookahead}]`;
    }
}

class ParseTransition<NT, T> implements Hashable {
    public token: NT|T;
    public newState: number;

    public constructor(token: NT|T, newState: number) {
        this.token = token;
        this.newState = newState;
    }

    public hash(): string {
        return this.token + ' ' + this.newState;
    }
}

class ParseState<NT, T> implements Hashable {
    public num: number;
    public items: ObjSet<ParseItem<NT, T>>;
    public transitions: ObjSet<ParseTransition<NT, T>>;

    public constructor(num: number, items: ObjSet<ParseItem<NT, T>>) {
        this.num = num;
        this.items = items;
        this.transitions = new ObjSet();
    }

    public transition(token: NT|T, newState: number) {
        this.transitions.add(new ParseTransition<NT, T>(token, newState));
    }

    public hash(): string {
        return this.items.hash();
    }
}

interface ParseAction<NT, T> {
    action: 'shift'|'reduce'|'accept';
    newState?: number;
    production?: Production<NT, T>;
}

interface ParseTable<NT, T> {
    positions: {[token: string]: number};
    actionTable: (ParseAction<NT, T>|null)[][];
    gotoTable: (number|null)[][];
}

class TableGenerator<NT, T> {
    public first: Map<NT|S|T, Set<S|T>>;
    public states: ParseState<NT, T>[];
    private goal: NT;
    private productions: Production<NT, T>[];
    private NTs: Set<NT>;
    private Ts: Set<T>;
    private NTProductions: Map<NT, Production<NT, T>[]>;

    public constructor(goal: NT, productions: Production<NT, T>[], NTs: Set<NT>, Ts: Set<T>) {
        this.goal = goal;
        this.productions = productions;
        this.NTs = NTs;
        this.Ts = Ts;
        this.NTProductions = this.calcNTProductions();
        this.first = this.calcFirst();
        this.states = this.calcStates();
    }

    public genTable(): ParseTable<NT, T> {
        const result: ParseTable<NT, T> = {
            positions: {},
            actionTable: [],
            gotoTable: [],
        };

        const Ts: (T|'eof')[] = Array.from(this.Ts);
        Ts.push('eof');
        Ts.sort();
        Ts.forEach((val, index) => {
            result.positions[val.toString()] = index;
        });

        const NTs = Array.from(this.NTs).sort();
        NTs.forEach((val, index) => {
            // .toString() is a hack to make the type checker shut up,
            // couldn't find another way
            result.positions[val.toString()] = index;
        });

        this.states.forEach(state => {
            const actionRow: (ParseAction<NT, T>|null)[] = [];
            for (const t of Ts) {
                actionRow.push(null);
            }
            const gotoRow: (number|null)[] = [];
            for (const nt of NTs) {
                gotoRow.push(null);
            }

            state.items.forEach(item => {
                // reduction!
                if (item.stacktop === item.production.rhs.length) {
                    if (item.production.lhs === this.goal &&
                            item.lookahead === 'eof') {
                        const index = result.positions[item.lookahead.toString()];
                        this.insertIntoRow(actionRow, index, {action: 'accept'});
                    } else {
                        const index = result.positions[item.lookahead.toString()];
                        this.insertIntoRow(actionRow, index,
                            {action: 'reduce', production: item.production});
                    }
                }
            });

            state.transitions.forEach(transition => {
                const isNT = this.isNT(transition.token);

                if (isNT) {
                    const index = result.positions[transition.token.toString()];

                    if (gotoRow[index] !== null) {
                        throw new Error('conflict in goto table!');
                    }

                    gotoRow[index] = transition.newState;
                } else {
                    const index = result.positions[transition.token.toString()];
                    this.insertIntoRow(actionRow, index,
                        {action: 'shift', newState: transition.newState});
                }
            });

            result.actionTable.push(actionRow);
            result.gotoTable.push(gotoRow);
        });

        return result;
    }

    public closure(items: ObjSet<ParseItem<NT, T>>): boolean {
        let changed = false;
        let changing = true;

        while (changing) {
            changing = false;

            items.forEach(item => {
                if (item.stacktop === item.production.rhs.length) {
                    // no thanks
                    return;
                }
                const top = item.production.rhs[item.stacktop];
                if (!this.isNT(top)) {
                    // no thanks again
                    return;
                }

                const leftovers: (NT|S|T)[] =
                    item.production.rhs.slice(item.stacktop + 1);
                leftovers.push(item.lookahead);
                const firstAfter = new Set<S|T>();
                this.calcFirstOfSeq(this.first, leftovers, firstAfter);

                const topProductions = this.NTProductions.get(top as NT);
                if (typeof topProductions === 'undefined') {
                    throw new Error(`no productions for NT ${top}`);
                }

                topProductions.forEach(production => {
                    firstAfter.forEach(tokenAfter => {
                        const newItem: ParseItem<NT, T> =
                            new ParseItem(production, 0, tokenAfter);
                        changing = items.add(newItem) || changing;
                    });
                });
            });

            changed = changed || changing;
        }

        return changed;
    }

    public goto(cci: ObjSet<ParseItem<NT, T>>, token: NT|T): ObjSet<ParseItem<NT, T>> {
        const items = new ObjSet<ParseItem<NT, T>>();

        cci.forEach(item => {
            if (item.stacktop < item.production.rhs.length &&
                    item.production.rhs[item.stacktop] === token) {
                const newItem = new ParseItem<NT, T>(
                    item.production, item.stacktop + 1, item.lookahead);
                items.add(newItem);
            }
        });

        this.closure(items);
        return items;
    }

    private insertIntoRow(row: (ParseAction<NT, T>|null)[], index: number,
                          entry: ParseAction<NT, T>) {
        const spot = row[index];
        if (spot === null) {
            row[index] = entry;
        } else {
            throw new Error(`${spot.action}-${entry.action} conflict!`);
        }
    }

    private calcNTProductions(): Map<NT, Production<NT, T>[]> {
        const result = new Map<NT, Production<NT, T>[]>();

        this.NTs.forEach(nt => {
            result.set(nt, []);
        });

        this.productions.forEach(production => {
            const NTProductions = result.get(production.lhs);

            if (typeof NTProductions === 'undefined') {
                throw new Error(`lhs of production ${production} is not a NT`);
            }

            NTProductions.push(production);
        });

        return result;
    }

    private firstOf(first: Map<NT|S|T, Set<S|T>>, token: NT|S|T): Set<S|T> {
        const firstSet = first.get(token);
        if (typeof firstSet === 'undefined') {
            throw Error(`first set for ${token} missing`);
        }
        return firstSet;
    }

    private setAdd<U>(victim: U, dest: Set<U>): boolean {
        const oldSize = dest.size;
        dest.add(victim);
        return dest.size > oldSize;
    }

    private setAddAll<U>(source: Set<U>, dest: Set<U>, skipFalsy?: boolean): boolean {
        let changed = false;
        source.forEach(val => {
            if (!skipFalsy || val) {
                changed = this.setAdd(val, dest) || changed;
            }
        });
        return changed;
    }

    private calcFirstOfSeq(first: Map<NT|S|T, Set<S|T>>, seq: (NT|S|T)[],
                           dest: Set<S|T>): boolean {
        if (seq.length === 0) {
            // FIRST[epsilon]
            return this.setAdd('', dest);
        } else {
            let changed = this.setAddAll(this.firstOf(first, seq[0]), dest, true);

            let i: number;
            for (i = 0; i < seq.length - 1 &&
                        this.firstOf(first, seq[i]).has(''); i++) {
                changed = this.setAddAll(
                    this.firstOf(first, seq[i + 1]), dest, true) || changed;
            }

            if (i === seq.length - 1 && this.firstOf(first, seq[i]).has('')) {
                changed = this.setAdd('', dest) || changed;
            }

            return changed;
        }
    }

    private calcFirst(): Map<NT|S|T, Set<S|T>> {
        const first = new Map<NT|S|T, Set<S|T>>();

        // FIRST[t] = {t} for all t in T
        this.Ts.forEach(t => {
            first.set(t, new Set<S|T>([t]));
        });
        first.set('', new Set<S|T>(['']));
        first.set('eof', new Set<S|T>(['eof']));

        // FIRST[nt] = {} for all nt in NT
        this.NTs.forEach(nt => {
            first.set(nt, new Set<S|T>());
        });

        let changing = true;

        while (changing) {
            changing = false;

            this.productions.forEach(production => {
                changing = this.calcFirstOfSeq(
                    first, production.rhs, this.firstOf(first, production.lhs)) || changing;
            });
        }

        return first;
    }

    private isNT(token: NT|S|T): boolean {
        return (this.NTs as Set<NT|S|T>).has(token);
    }

    private calcStates(): ParseState<NT, T>[] {
        const states = new ObjSet<ParseState<NT, T>>();
        const unprocessedStates: ParseState<NT, T>[] = [];

        const goalProductions = this.NTProductions.get(this.goal);
        if (typeof goalProductions === 'undefined') {
            throw new Error('goal NT has no productions (sounds fun)');
        }

        const cc0Items = new ObjSet<ParseItem<NT, T>>(
            goalProductions.map(production => new ParseItem<NT, T>(production, 0, 'eof')));
        this.closure(cc0Items);
        const cc0 = new ParseState<NT, T>(0, cc0Items);

        states.add(cc0);
        unprocessedStates.push(cc0);

        while (unprocessedStates.length > 0) {
            const cci = unprocessedStates.pop() as ParseState<NT, T>;

            cci.items.forEach(item => {
                if (item.stacktop < item.production.rhs.length) {
                    const top = item.production.rhs[item.stacktop];
                    let newState = new ParseState(states.size(), this.goto(cci.items, top));

                    if (states.add(newState)) {
                        unprocessedStates.push(newState);
                    } else {
                        newState = states.get(newState) as ParseState<NT, T>;
                    }

                    cci.transition(top, newState.num);
                }
            });
        }

        return states.toArray().sort(
            (left: ParseState<NT, T>, right: ParseState<NT, T>) => left.num - right.num);
    }
}

export { TableGenerator, S, ParseItem, ParseState, ParseTransition, ParseAction };
