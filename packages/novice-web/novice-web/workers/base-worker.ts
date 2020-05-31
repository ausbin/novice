abstract class BaseWorker<FrontendMessageType, WorkerMessageType> {
    private ctx: Worker;

    public constructor(ctx: Worker) {
        this.ctx = ctx;

        this.onMessageHandler = this.onMessageHandler.bind(this);
    }

    // Register events
    public register(): void {
        this.ctx.onmessage = this.onMessageHandler;
    }

    public onMessageHandler(event: MessageEvent): void {
        const msg: FrontendMessageType = event.data;
        this.onFrontendMessage(msg);
    }

    protected abstract onFrontendMessage(frontendMessage: FrontendMessageType): void;

    protected sendWorkerMessage(workerMessage: WorkerMessageType): void {
        this.ctx.postMessage(workerMessage);
    }
}

export { BaseWorker };
