import * as readline from 'readline';
import { Readable, Writable } from 'stream';
import { IO, Isa } from '../isa';
import { Debugger } from './debugger';

class PromptIO implements IO {
    public rl!: readline.Interface;

    public async getc(): Promise<number> {
        let bad = true;
        let c = 0;

        while (bad) {
            const answer: string = await new Promise(resolve => {
                this.rl.question('> ', resolve);
            });

            if (bad = answer.length !== 1) {
                this.rl.write('please type exactly 1 character\n');
            } else {
                c = answer.charCodeAt(0);
            }
        }

        return c;
    }

    public putc(c: number): void {
        this.rl.write(String.fromCharCode(c));
    }
}

class CliDebugger extends Debugger {
    private stdin: Readable;
    private stdout: Writable;
    private rl: readline.Interface;
    private exit: boolean;

    public constructor(isa: Isa, stdin: Readable, stdout: Writable) {
        const io = new PromptIO();
        super(isa, io);

        this.stdin = stdin;
        this.stdout = stdout;

        this.rl = readline.createInterface({
            input: this.stdin,
            output: this.stdout,
        });
        this.rl.on('SIGINT', this.onInterrupt.bind(this));
        io.rl = this.rl;

        this.exit = false;
    }

    public async run(): Promise<void> {
        let showState = true;

        while (!this.exit) {
            if (showState) {
                this.printSimState();
            }
            showState = true;

            const answer = await new Promise(resolve => {
                this.rl.question('(novice) ', resolve);
            });

            switch (answer) {
                case 'c':
                case 'co':
                case 'con':
                case 'cont':
                case 'conti':
                case 'contin':
                case 'continu':
                case 'continue':
                case 'r':
                case 'ru':
                case 'run':
                    try {
                        await this.cont();
                    } catch (err) {
                        this.rl.write(`sim error: ${err.message}\n`);
                    }
                    break;

                case 's':
                case 'st':
                case 'ste':
                case 'step':
                    try {
                        await this.step();
                    } catch (err) {
                        this.rl.write(`sim error: ${err.message}\n`);
                    }
                    break;

                case '?':
                case 'h':
                case 'he':
                case 'hel':
                case 'help':
                    showState = false;
                    this.rl.write('novice debugger usage:\n');
                    this.rl.write('\n');
                    this.rl.write('c[ontinue]    run code until halt or breakpoint\n');
                    this.rl.write('s[tep]        run a single instruction\n');
                    this.rl.write('h[elp]        show this message\n');
                    this.rl.write('q[uit]        escape this foul debugger\n');
                    break;

                case 'q':
                case 'qu':
                case 'qui':
                case 'quit':
                    this.exit = true;
                    break;

                default:
                    showState = false;
                    this.rl.write(`unknown command \`${answer}'. run ` +
                                  `\`help' for a list of commands\n`);
            }
        }

        this.rl.close();
    }

    private printSimState(): void {
        this.rl.write(`pc: 0x${this.pc.toString(16)}\n`);
    }

    // Interrupt execution (e.g. infinite loop)
    private onInterrupt(): void {
        this.interrupt = true;
    }
}

export { CliDebugger };
