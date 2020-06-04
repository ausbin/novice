import { Debugger, getIsa, IO, MachineStateUpdate } from 'novice';
import { BaseWorker } from '../base-worker';
import { DebuggerFrontendMessage, DebuggerWorkerMessage } from './proto';
import { SnitchDebugger } from './snitch-debugger';

class DebuggerWorker extends BaseWorker<DebuggerFrontendMessage,
                                        DebuggerWorkerMessage> {
    private dbg: Debugger|null;
    private io: IO;

    public constructor(ctx: Worker) {
        super(ctx);

        this.dbg = null;
        // TODO: Add actual IO
        this.io = {
            getc: () => Promise.resolve(0),
            putc: (c: number) => {
                this.sendWorkerMessage({ kind: 'putc', c });
            },
        };
    }

    protected onFrontendMessage(msg: DebuggerFrontendMessage): void {
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

            case 'unstep':
                if (!this.dbg) {
                    throw new Error('must reset before unstepping');
                }

                this.dbg.unstep();
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
        this.sendWorkerMessage({kind: 'updates', updates});
    }
}

export { DebuggerWorker };
