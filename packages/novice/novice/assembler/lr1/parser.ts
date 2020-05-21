import { Line, Token } from '../scanner';
import { Production } from './production';
import { ParseTable } from './tablegen';

type State = number;

interface ParseTree<NT extends string, T extends string> {
    token: NT|T;
    val?: string;
    line?: number;
    col?: number;
    children: ParseTree<NT, T>[];
}

class Parser<NT extends string, T extends string> {
    private table: ParseTable<NT, T>;

    public constructor(table: ParseTable<NT, T>) {
        this.table = table;
    }

    public parse(line: Line<T>): ParseTree<NT, T> {
        const stack: (ParseTree<NT, T>|State)[] = [];
        stack.push(0);

        let i = 0;
        let token: Token<T>|null = line.tokens[i++] || null;

        while (true) {
            let state = stack[stack.length - 1] as State;
            const kind: T|'eof' = token ? token.kind : 'eof';
            const index = this.table.positions[kind];
            const entry = this.table.actionTable[state][index];

            if (entry === null) {
                if (token) {
                    throw new Error(`parse error: unexpected token ` +
                                    `\`${token.val}' on line ${line.num} ` +
                                    `and column ${token.col}`);
                } else {
                    throw new Error(`parse error: unexpected end-of-line on ` +
                                    `line ${line.num}`);
                }
            }
            switch (entry.action) {
                case 'shift':
                    stack.push({token: token.kind, val: token.val,
                                line: line.num, col: token.col, children: []});
                    stack.push(entry.newState as number);
                    token = line.tokens[i++] || null;
                    break;

                case 'accept':
                case 'reduce':
                    const production = entry.production as Production<NT, T>;
                    const parseTree: ParseTree<NT, T> = {token: production.lhs, children: []};
                    const numToPop = production.rhs.length * 2;

                    for (let j = stack.length - numToPop; j < stack.length; j += 2) {
                        (parseTree.children as ParseTree<NT, T>[]).push(stack[j] as ParseTree<NT, T>);
                    }

                    if (entry.action === 'accept') {
                        return parseTree;
                    } else {
                        for (let j = 0; j < numToPop; j++) {
                            stack.pop();
                        }
                        state = stack[stack.length - 1] as State;
                        stack.push(parseTree);

                        const gotoIndex = this.table.positions[production.lhs];
                        stack.push(this.table.gotoTable[state][gotoIndex] as State);
                    }
                    break;
            }
        }
    }
}

export { Parser, ParseTree };
