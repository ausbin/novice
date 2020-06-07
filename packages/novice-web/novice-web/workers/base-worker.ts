abstract class BaseWorker<FrontendMessageType, WorkerMessageType> {
    private ctx: Worker;
    private messageQueue: FrontendMessageType[];
    private newFrontendMessage!: Promise<void>;
    private triggerNewFrontendMessage!: () => void;

    public constructor(ctx: Worker) {
        this.ctx = ctx;
        this.messageQueue = [];

        this.onMessageHandler = this.onMessageHandler.bind(this);
        this.setupPromiseHack();
    }

    public run(): void {
        // Register events
        this.ctx.onmessage = this.onMessageHandler;

        this.workerLoop();
    }

    public onMessageHandler(event: MessageEvent): void {
        const msg: FrontendMessageType = event.data;

        this.onFrontendMessage(msg);
    }

    protected abstract async onFrontendMessage(frontendMessage: FrontendMessageType): Promise<void>;

    protected sendWorkerMessage(workerMessage: WorkerMessageType): void {
        this.ctx.postMessage(workerMessage);
    }

    private setupPromiseHack(): void {
        this.newFrontendMessage = new Promise<void>(resolve => {
            this.triggerNewFrontendMessage = resolve;
        });
    }

    private newMessageReady(msg: FrontendMessageType) {
        this.messageQueue.push(msg);
        // Even if the promise has already resolved, it's okay to call
        // resolve() again as we are here: https://stackoverflow.com/a/43361520/321301
        this.triggerNewFrontendMessage();
    }

    private async workerLoop(): Promise<void> {
        while (true) {
            await this.newFrontendMessage;
            this.setupPromiseHack();

            let msg: FrontendMessageType|undefined;

            while (msg = this.messageQueue.shift()) {
                await this.onFrontendMessage(msg);
            }
        }
    }
}

export { BaseWorker };
