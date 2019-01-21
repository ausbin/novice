import * as readline from 'readline';
import { Readable, Writable } from 'stream';
import { IO, Isa } from '../isa';
import { padStr } from '../util';
import { Debugger } from './debugger';

interface Command {
    op: string[];
    operands: number;
    showState: boolean;
    method: (operands: string[]) => Promise<void>;
    help: string;
}

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
    private commands: Command[];

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
        this.commands = [
            {op: ['continue', 'run'], operands: 0,
             showState: true, method: this.cont,
             help: 'run code until halt or breakpoint'},

            {op: ['break'], operands: 1,
             showState: false, method: this.breakCmd,
             help: 'set a breakpoint'},

            {op: ['step'], operands: 0,
             showState: true, method: this.step,
             help: 'run a single instruction'},

            {op: ['help'], operands: 0,
             showState: false, method: this.printHelp,
             help: 'show this message'},

            {op: ['quit'], operands: 0,
             showState: false, method: this.quit,
             help: 'escape this foul debugger'},
        ];
    }

    public async run(): Promise<void> {
        let showState = true;

        while (!this.exit) {
            if (showState) {
                this.printSimState();
            }
            showState = true;

            const answer: string = await new Promise(resolve => {
                this.rl.question('(novice) ', resolve);
            });

            const splat = answer.trim().split(/\s+/);
            const op = splat[0];
            const operands = splat.slice(1);

            let cmd: Command|null = null;

            for (const cmdSpec of this.commands) {
                if (cmdSpec.op.some(o => o.startsWith(op))) {
                    cmd = cmdSpec;
                    break;
                }
            }

            if (cmd) {
                try {
                    if (operands.length != cmd.operands) {
                        throw new Error(`command ${cmd.op[0]} expects ` +
                                        `${cmd.operands} operands but got ` +
                                        `${operands.length}`);
                    }

                    await cmd.method.bind(this)(operands);
                    showState = cmd.showState;
                } catch (err) {
                    this.stdout.write(`error: ${err.message}\n`);
                    showState = false;
                }
            } else {
                this.stdout.write(`unknown command \`${answer}'. run ` +
                                  `\`help' for a list of commands\n`);
                showState = false;
            }
        }
    }

    public close(): void {
        this.rl.close();
    }

    private async breakCmd(operands: string[]): Promise<void> {
        const [operand] = operands;
        const base = operand.toLowerCase().startsWith('0x')? 16 :
                     /\d+/.test(operand)? 10 : -1;

        let addr: number;
        if (base === -1) {
            throw new Error('labels not yet implemented sorry');
        } else {
            addr = parseInt(operand, base);
        }

        this.addBreakpoint(addr);
        this.stdout.write(`breakpoint set at 0x${addr.toString(16)}\n`);
    }

    private async printHelp(): Promise<void> {
        this.stdout.write('novice debugger usage:\n');
        this.stdout.write('\n');

        const padTo = Math.max.apply(Math, this.commands.map(cmd => cmd.op[0].length + 2));
        for (const cmd of this.commands) {
            const padded = padStr(`${cmd.op[0][0]}[${cmd.op[0].slice(1)}]`, padTo,
                                  ' ', true);
            this.stdout.write(`${padded}  ${cmd.help}\n`);
        }
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

    private async quit(): Promise<void> {
        this.exit = true;
    }
}

export { CliDebugger };
