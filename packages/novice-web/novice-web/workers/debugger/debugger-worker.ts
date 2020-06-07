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

    protected async onFrontendMessage(msg: DebuggerFrontendMessage): Promise<void> {
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

                await this.dbg.step();
                break;

            case 'unstep':
                if (!this.dbg) {
                    throw new Error('must reset before unstepping');
                }

                // Maintain the lie that the debugger "freezes" on a halt by
                // double-unstepping on halts. Without this, after executing a
                // halt, it seems like nothing happened.
                //
                // We do this here instead of the frontend in case the
                // frontend batches up n unstep requests while sitting
                // on a halt before getting any machine state updates
                // from the debugger worker. In such a case, if we did
                // this check in the frontend, we would send 2n unstep
                // requests instead of correctly sending n + 1.
                if (this.dbg.isHalted() && this.dbg.getLogLength() > 1) {
                    this.dbg.unstep();
                }

                this.dbg.unstep();
                break;

            case 'run':
                if (!this.dbg) {
                    throw new Error('must reset before running');
                }

                await this.dbg.run();
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
