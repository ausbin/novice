import { FrontendMessage, WorkerMessage } from './proto';

class DebuggerWorker {
    private ctx: Worker;

    public constructor(ctx: Worker) {
        this.ctx = ctx;
    }

    // Register events
    public register(): void {
        this.ctx.onmessage = this.onMessage.bind(this);
    }

    public onMessage(event: MessageEvent): void {
        const msg: FrontendMessage = event.data;
        console.log('worker got message:', msg);
    }

    private postMessage(msg: WorkerMessage): void {
        this.ctx.postMessage(msg);
    }
}

export { DebuggerWorker };
