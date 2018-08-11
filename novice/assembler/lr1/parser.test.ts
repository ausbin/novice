import { ParseTable } from './tablegen';
import { Production } from './production';
import { Token, Line } from '../scanner';
import { Parser, ParseTree } from './parser';

describe('parser', () => {
    describe('parentheses grammar from textbook', () => {
        type NT = 'goal' | 'list' | 'pair';
        type T = '(' | ')';

        const productions: Production<NT, T>[] = [
            new Production<NT, T>('goal', ['list']),
            new Production<NT, T>('list', ['list', 'pair']),
            new Production<NT, T>('list', ['pair']),
            new Production<NT, T>('pair', ['(', 'pair', ')']),
            new Production<NT, T>('pair', ['(', ')']),
        ];

        const table: ParseTable<NT, T> = {
            positions: {
                'eof': 0, '(': 1, ')': 2,
                'list': 0, 'pair': 1,
            },
            actionTable: [
                [ null, {action: 'shift', newState: 3}, null ],
                [ {action: 'accept', production: productions[0]}, {action: 'shift', newState: 3}, null ],
                [ {action: 'reduce', production: productions[2]}, {action: 'reduce', production: productions[2]}, null ],
                [ null, {action: 'shift', newState: 6}, {action: 'shift', newState: 7} ],
                [ {action: 'reduce', production: productions[1]}, {action: 'reduce', production: productions[1]}, null ],
                [ null, null, {action: 'shift', newState: 8} ],
                [ null, {action: 'shift', newState: 6}, {action: 'shift', newState: 10} ],
                [ {action: 'reduce', production: productions[4]}, {action: 'reduce', production: productions[4]}, null ],
                [ {action: 'reduce', production: productions[3]}, {action: 'reduce', production: productions[3]}, null ],
                [ null, null, {action: 'shift', newState: 11} ],
                [ null, null, {action: 'reduce', production: productions[4]} ],
                [ null, null, {action: 'reduce', production: productions[3]} ],
            ],
            gotoTable: [
                [    1,    2 ],
                [ null,    4 ],
                [ null, null ],
                [ null,    5 ],
                [ null, null ],
                [ null, null ],
                [ null,    9 ],
                [ null, null ],
                [ null, null ],
                [ null, null ],
                [ null, null ],
                [ null, null ],
            ],
        };

        let parser: Parser<NT, T>;

        beforeEach(() => {
            parser = new Parser(table);
        });

        it('builds parse tree for trivial string', () => {
            const tokens: Token<T>[] = [
                {col: 1, val: '(', kind: '('},
                {col: 10, val: ')', kind: ')'},
            ];
            const line: Line<T> = {num: 69, tokens: tokens};

            const expectedParseTree: ParseTree<NT, T> =
                {token: 'goal', children: [
                    {token: 'list', children: [
                        {token: 'pair', children: [
                            {token: '(', val: '(', line: 69, col: 1},
                            {token: ')', val: ')', line: 69, col: 10},
                        ]},
                    ]},
                ]}

            expect(parser.parse(line)).toEqual(expectedParseTree);
        });

        it('builds parse tree for longer string', () => {
            const tokens: Token<T>[] = [
                {col: 1, val: '(', kind: '('},
                {col: 2, val: '(', kind: '('},
                {col: 3, val: ')', kind: ')'},
                {col: 4, val: ')', kind: ')'},
                {col: 5, val: '(', kind: '('},
                {col: 6, val: ')', kind: ')'},
            ];
            const line: Line<T> = {num: 42, tokens: tokens};

            const expectedParseTree: ParseTree<NT, T> =
                {token: 'goal', children: [
                    {token: 'list', children: [
                        {token: 'list', children: [
                            {token: 'pair', children: [
                                {token: '(', val: '(', line: 42, col: 1},
                                {token: 'pair', children: [
                                    {token: '(', val: '(', line: 42, col: 2},
                                    {token: ')', val: ')', line: 42, col: 3},
                                ]},
                                {token: ')', val: ')', line: 42, col: 4},
                            ]},
                        ]},
                        {token: 'pair', children: [
                            {token: '(', val: '(', line: 42, col: 5},
                            {token: ')', val: ')', line: 42, col: 6},
                        ]},
                    ]},
                ]}

            expect(parser.parse(line)).toEqual(expectedParseTree);
        });

        it('blows up for early eof', () => {
            const tokens: Token<T>[] = [
                {col: 1, val: '(', kind: '('},
                {col: 4, val: '(', kind: '('},
                {col: 6, val: ')', kind: ')'},
            ];
            const line: Line<T> = {num: 420, tokens: tokens};

            expect(() => {parser.parse(line)}).toThrow('unexpected end-of-file');
        });

        it('blows up for unexpected token', () => {
            const tokens: Token<T>[] = [
                {col: 1, val: '(', kind: '('},
                {col: 4, val: '(', kind: '('},
                {col: 6, val: ')', kind: ')'},
                {col: 7, val: ')', kind: ')'},
                {col: 9, val: ')', kind: ')'},
            ];
            const line: Line<T> = {num: 69, tokens: tokens};

            expect(() => {parser.parse(line)}).toThrow(
                "unexpected token `)' at line 69 and column 9");
        });
    });
});
