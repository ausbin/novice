import { Readable } from 'stream';
import { DFA } from './dfa';

interface Token<T> {
    col: number;
    val: string;
    kind: T;
}

interface Line<T> {
    num: number;
    tokens: Token<T>[];
}

class Scanner<T> {
    private static readonly EOF = '';
    private currentToken!: string;
    private lines!: Line<T>[];
    private dfas: DFA<T>[];
    private newline!: boolean;
    private lineNum!: number;
    private col!: number;
    private lastChar!: string;
    private rejectCallback!: (err: Error) => void;

    constructor(dfas: DFA<T>[]) {
        this.dfas = dfas;
        this.reset();
    }

    public async scan(fp: Readable): Promise<Line<T>[]> {
        this.reset();

        const endPromise = new Promise((resolve, reject) => {
            this.rejectCallback = reject;
            fp.on('end', () => {
                // send EOF to scanner
                this.nextChar(Scanner.EOF);
                resolve();
            });
        });
        fp.on('data', this.onData.bind(this));
        await endPromise;
        return this.lines;
    }

    private reset(): void {
        this.currentToken = '';
        this.lines = [];
        this.dfas.forEach(dfa => dfa.reset());
        // Need to add a new line for the next token (at the beginning
        // of the file or after a newline)
        this.newline = true;
        this.lineNum = 1;
        this.col = 1;
        this.lastChar = '';
    }

    private onData(data: string | Buffer) {
        let buf: string;
        if (typeof data === 'string') {
            buf = data;
        } else {
            buf = data.toString();
        }

        for (let i = 0; i < buf.length; i++) {
            this.nextChar(buf.charAt(i));
        }
    }

    private nextChar(c: string) {
        const newline = c === '\r' || c === '\n';
        const eof = newline || c === Scanner.EOF;

        if (!eof) {
            this.currentToken += c;
            this.dfas.forEach(dfa => dfa.feed(c));
        }

        if (eof || this.dfas.every(dfa => !dfa.isAlive())) {
            const best = this.dfas.reduce((bestDfa, dfa) =>
                (dfa.getAcceptingLength() > bestDfa.getAcceptingLength())
                ? dfa : bestDfa);

            if (best.getAcceptingLength() > 0) {
                const tokenLen = best.getAcceptingLength();
                const tokenT = best.getT();

                // Leave out stuff like whitespace (will be null in that
                // case)
                if (tokenT) {
                    if (this.newline) {
                        this.newline = false;
                        this.lines.push({num: this.lineNum, tokens: []});
                    }
                    const newVal = this.currentToken.substring(0, tokenLen);
                    const newToken = {col: this.col, val: newVal, kind: tokenT};
                    this.lines[this.lines.length - 1].tokens.push(newToken);
                }

                this.col += tokenLen;

                const leftovers = this.currentToken.substring(tokenLen);
                this.currentToken = '';
                this.dfas.forEach(dfa => dfa.reset());

                // Re-ingest characters we used to find this token
                for (let i = 0; i < leftovers.length; i++) {
                    this.nextChar(leftovers.charAt(i));
                }
                // Also need to re-ingest EOF
                if (eof && leftovers.length > 0) {
                    this.nextChar(Scanner.EOF);
                }
            } else if (this.currentToken !== '') {
                const err =  new Error(
                    `scanner error: unexpected character \`${c}' on line ` +
                    `${this.lineNum} column ${this.col}`);
                this.rejectCallback(err);
                return;
            }
        }

        if (newline) {
            // Don't double count DOS newlines
            if (!(this.lastChar === '\r' && c === '\n')) {
                this.lineNum++;
            }

            this.col = 1;
            this.newline = true;
        }

        this.lastChar = c;
    }
}

export { Line, Token, Scanner };
