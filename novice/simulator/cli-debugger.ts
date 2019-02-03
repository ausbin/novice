import * as readline from 'readline';
import { Readable, Writable } from 'stream';
import { IO, Isa } from '../isa';
import { forceUnsigned, maxUnsignedVal, padStr } from '../util';
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
    public buf: string;

    public constructor() {
        this.buf = '';
    }

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
        const character = String.fromCharCode(c);
        this.buf += character;
        this.stdout.write(character);
    }
}

class CliDebugger extends Debugger {
    private stdin: Readable;
    private stdout: Writable;
    private rl: readline.Interface;
    private promptIo: PromptIO;
    private exit: boolean;
    private commands: Command[];

    public constructor(isa: Isa, stdin: Readable, stdout: Writable) {
        const DEFAULT_MAX_EXEC = 1 << 13;
        const io = new PromptIO();
        super(isa, io, DEFAULT_MAX_EXEC);

        this.stdin = stdin;
        this.stdout = stdout;

        this.rl = readline.createInterface({
            input: this.stdin,
            output: this.stdout,
        });
        this.rl.on('SIGINT', this.onInterrupt.bind(this));
        this.promptIo = io;
        this.promptIo.rl = this.rl;
        this.promptIo.stdout = this.stdout;

        this.exit = false;
        this.commands = [
            {op: ['continue', 'run'], operands: 0,
             showState: true, method: this.cont,
             help: 'run code until halt or breakpoint'},

            {op: ['break'], operands: 1,
             showState: false, method: this.breakCmd,
             help: 'set a breakpoint, ex: 0x3069'},

            {op: ['step'], operands: 0,
             showState: true, method: this.step,
             help: 'run a single instruction'},

            {op: ['unstep', 'undo'], operands: 0,
             showState: true, method: this.unstepCmd,
             help: 'undo the last instruction'},

            {op: ['print'], operands: 1,
             showState: false, method: this.printCmd,
             help: 'print an address range, ex: 0xef00-0xf000'},

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
        let last: [Command|null, string[]] = [null, []];

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
            let operands = splat.slice(1);
            let cmd: Command|null;

            if (!op) {
                // Imitate the gdb behavior of a blank command being 'do
                // the previous command again'
                [cmd, operands] = last;
            } else {
                cmd = null;

                for (const cmdSpec of this.commands) {
                    if (cmdSpec.op.some(o => o.startsWith(op))) {
                        cmd = cmdSpec;
                        break;
                    }
                }
            }

            if (cmd) {
                try {
                    if (operands.length !== cmd.operands) {
                        throw new Error(`command ${cmd.op[0]} expects ` +
                                        `${cmd.operands} operands but got ` +
                                        `${operands.length}`);
                    }

                    this.promptIo.buf = '';

                    await cmd.method.bind(this)(operands);
                    showState = cmd.showState;
                    last = [cmd, operands];

                    // To avoid breaking the prompt
                    if (this.promptIo.buf &&
                            this.promptIo.buf[this.promptIo.buf.length - 1] !== '\n') {
                        this.stdout.write('↲\n');
                    }
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

    private parseAddr(operand: string): number {
        const base = operand.toLowerCase().startsWith('0x') ? 16 :
                     /\d+/.test(operand) ? 10 : -1;
        let addr: number;
        if (base === -1) {
            throw new Error('labels not yet implemented sorry');
        } else {
            addr = parseInt(operand, base);
        }
        return addr;
    }

    private parseAddrRange(operand: string): [number, number] {
        const splat = operand.split('-');
        let lo: number;
        let hi: number;
        if (splat.length === 1) {
            lo = hi = this.parseAddr(splat[0]);
        } else if (splat.length === 2) {
            [lo, hi] = splat.map(o => this.parseAddr(o));
        } else {
            throw new Error(`expected range like 0x100-0x200 but got ` +
                            `\`${operand}'`);
        }

        return [lo, hi];
    }

    private fmtHex(val: number, bits: number): string {
        return '0x' + padStr(forceUnsigned(val, bits).toString(16),
                             Math.ceil(bits / 4), '0');
    }

    private fmtAddr(addr: number): string {
        return this.fmtHex(addr, this.isa.mem.space);
    }

    private fmtWord(word: number): string {
        return this.fmtHex(word, this.isa.mem.word);
    }

    private async unstepCmd(): Promise<void> {
        this.unstep();
    }

    private async breakCmd(operands: string[]): Promise<void> {
        const addr = this.parseAddr(operands[0]);
        this.addBreakpoint(addr);
        this.stdout.write(`breakpoint set at 0x${addr.toString(16)}\n`);
    }

    private async printCmd(operands: string[]): Promise<void> {
        this.printMemRegion(this.pc, ...this.parseAddrRange(operands[0]));
    }

    private printMemRegion(actualPc: number, fromPc: number, toPc: number): void {
        const padDecTo = Math.floor(Math.log10(Math.pow(2, this.isa.mem.word - 1) - 1)) + 2;
        const hasPc = fromPc <= actualPc && actualPc <= toPc;
        const disassembled = this.disassembleRegion(fromPc, toPc);

        let longestInstr = 0;
        for (const spot of disassembled) {
            const instrLen = spot[3] ? spot[3].length : 0;
            longestInstr = Math.max(longestInstr, instrLen);
        }

        if (longestInstr > 0) {
            // Add two spaces for between instructions and labels, but
            // only if we actually disassembled some instructions
            longestInstr += 2;
        }

        for (const spot of disassembled) {
            const [pc, word, sext, instr, labels] = spot;
            this.stdout.write(`${!hasPc ? '' : pc === actualPc ? '==> ' : '    '}` +
                              `${this.fmtAddr(pc)}:  ` +
                              `${this.fmtWord(word)}  ` +
                              `${padStr(sext.toString(10), padDecTo, ' ', true)}  ` +
                              `${padStr(instr || '', longestInstr, ' ', true)}` +
                              `${labels.join(' ')}\n`);
        }
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

        this.stdout.write('\n');
        this.stdout.write('(an empty command means re-run the last command)\n');
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
                    const regval = forceUnsigned(this.regs.range[reg.prefix][i],
                                                 this.isa.mem.word);
                    const padded = padStr(regval.toString(base),
                                          (base === 2) ? reg.bits : nibbles, '0');
                    const after = ((i + 1) % rowSize && i < reg.count - 1) ? ' ' : '\n';
                    this.stdout.write(`${regname}: ${prefix}${padded}${after}`);
                }
            } else if (reg.kind === 'reg') {
                const nibbles = Math.ceil(reg.bits / 4);
                const base = (reg.bits <= 4) ? 2 : 16;
                const prefix = (reg.bits === 1) ? '' : (base === 2) ? '0b' : '0x';
                const regval = forceUnsigned(this.regs.solo[reg.name],
                                             this.isa.mem.word);
                const padded = padStr(regval.toString(base),
                                      (base === 2) ? reg.bits : nibbles, '0');
                this.stdout.write(`${reg.name}: ${prefix}${padded}\n`);
            } else {
                const _: never = reg;
            }
        }

        this.stdout.write('\n');

        // Be a little dishonest: to avoid confusing users, get 'stuck'
        // on halts
        const pc = this.halted ? this.pc - this.isa.pc.increment : this.pc;
        const fromPc = Math.max(0, pc - 4);
        const toPc = Math.min(maxUnsignedVal(this.isa.mem.space), pc + 4);
        this.printMemRegion(pc, fromPc, toPc);
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
