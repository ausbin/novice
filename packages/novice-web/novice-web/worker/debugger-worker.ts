import { Debugger, getIsa, IO, MachineStateUpdate } from 'novice';
import { FrontendMessage, WorkerMessage } from './proto';
import { SnitchDebugger } from './snitch-debugger';

class DebuggerWorker {
    private ctx: Worker;
    private dbg: Debugger|null;
    private io: IO;

    public constructor(ctx: Worker) {
        this.ctx = ctx;
        this.dbg = null;
        // TODO: Add actual IO
        this.io = {
            getc: () => Promise.resolve(0),
            putc: (c: number) => undefined,
        };
    }

    // Register events
    public register(): void {
        this.ctx.onmessage = this.onMessage.bind(this);
    }

    public onMessage(event: MessageEvent): void {
        const msg: FrontendMessage = event.data;

        switch (msg.kind) {
            case 'reset':
                this.dbg = new SnitchDebugger(getIsa(msg.isa), this.io, -1,
                                              this.onUpdates.bind(this));
                break;

            case 'load-sections':
                if (!this.dbg) {
                    throw new Error('must reset before loading sections');
                }

                this.dbg.loadSections(msg.sections);
                break;

            case 'interrupt':
                if (!this.dbg) {
                    throw new Error('must reset before interrupting');
                }

                this.dbg.onInterrupt();
                break;

            case 'step':
                if (!this.dbg) {
                    throw new Error('must reset before stepping');
                }

                this.dbg.step();
                break;

            case 'run':
                if (!this.dbg) {
                    throw new Error('must reset before running');
                }

                this.dbg.run();
                break;

            default:
                const _: never = msg;
        }
    }

    private onUpdates(updates: MachineStateUpdate[]): void {
        this.postMessage({kind: 'updates', updates});
    }

    private postMessage(msg: WorkerMessage): void {
        this.ctx.postMessage(msg);
    }
}

export { DebuggerWorker };
