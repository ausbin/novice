import * as readline from 'readline';
import { Readable, Writable } from 'stream';
import { IO, Isa } from '../isa';
import { padStr } from '../util';
import { Debugger } from './debugger';

class PromptIO implements IO {
    public rl!: readline.Interface;
    public stdout!: Writable;

    public async getc(): Promise<number> {
        let bad = true;
        let c = 0;

        while (bad) {
            const answer: string = await new Promise(resolve => {
                this.rl.question('', resolve);
            });

            if (bad = answer.length !== 1) {
                this.stdout.write('please type exactly 1 character\n');
            } else {
                c = answer.charCodeAt(0);
            }
        }

        return c;
    }

    public putc(c: number): void {
        this.stdout.write(String.fromCharCode(c));
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
        io.stdout = this.stdout;

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
                        this.stdout.write(`sim error: ${err.message}\n`);
                    }
                    break;

                case 's':
                case 'st':
                case 'ste':
                case 'step':
                    try {
                        await this.step();
                    } catch (err) {
                        this.stdout.write(`sim error: ${err.message}\n`);
                    }
                    break;

                case '?':
                case 'h':
                case 'he':
                case 'hel':
                case 'help':
                    showState = false;
                    this.stdout.write('novice debugger usage:\n');
                    this.stdout.write('\n');
                    this.stdout.write('c[ontinue]    run code until halt or breakpoint\n');
                    this.stdout.write('s[tep]        run a single instruction\n');
                    this.stdout.write('h[elp]        show this message\n');
                    this.stdout.write('q[uit]        escape this foul debugger\n');
                    break;

                case 'q':
                case 'qu':
                case 'qui':
                case 'quit':
                    this.exit = true;
                    break;

                default:
                    showState = false;
                    this.stdout.write(`unknown command \`${answer}'. run ` +
                                  `\`help' for a list of commands\n`);
            }
        }
    }

    public close(): void {
        this.rl.close();
    }

    private printSimState(): void {
        // Print registers
        // This looks really awful, but it's just tedious string
        // formatting code
        for (const reg of this.isa.regs) {
            if (reg.kind === 'reg-range') {
                const nibbles = Math.ceil(reg.bits / 4);
                const rowSize = Math.ceil(16 / nibbles);
                const maxLen = Math.floor(Math.log10(reg.count)) + 2;
                const base = (reg.bits <= 4) ? 2 : 16;
                const prefix = (reg.bits === 1) ? '' : (base === 2) ? '0b' : '0x';

                for (let i = 0; i < reg.count; i++) {
                    // TODO: aliases
                    const regname = padStr(`${reg.prefix}${i}`, maxLen, ' ');
                    const regval = Math.abs(this.regs.range[reg.prefix][i]);
                    const padded = padStr(regval.toString(base),
                                          (base === 2) ? reg.bits : nibbles, '0');
                    const after = ((i + 1) % rowSize && i < reg.count - 1) ? ' ' : '\n';
                    this.stdout.write(`${regname}: ${prefix}${padded}${after}`);
                }
            } else if (reg.kind === 'reg') {
                const nibbles = Math.ceil(reg.bits / 4);
                const base = (reg.bits <= 4) ? 2 : 16;
                const prefix = (reg.bits === 1) ? '' : (base === 2) ? '0b' : '0x';
                const regval = Math.abs(this.regs.solo[reg.name]);
                const padded = padStr(regval.toString(base),
                                      (base === 2) ? reg.bits : nibbles, '0');
                this.stdout.write(`${reg.name}: ${prefix}${padded}\n`);
            } else {
                const _: never = reg;
            }
        }

        // Be a little dishonest: to avoid confusing users, get 'stuck'
        // on halts
        const pc = this.halted ? this.pc - this.isa.pc.increment : this.pc;
        this.stdout.write(`\n==> 0x${pc.toString(16)}: ${this.disassembleAt(pc)}\n`);
    }

    // Interrupt execution (e.g. infinite loop)
    private onInterrupt(): void {
        this.interrupt = true;
    }
}

export { CliDebugger };
