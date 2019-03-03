import { FullMachineState, getIsa, Isa } from 'novice';
import * as React from 'react';
import { FrontendMessage, WorkerMessage } from '../worker/proto';

export interface GuiDebuggerProps {
    workerBundleUrl: string;
    isaName: string;
}

export interface GuiDebuggerState {
    state: FullMachineState;
}

// State is never set so we use the '{}' type.
export class GuiDebugger extends React.Component<GuiDebuggerProps,
                                                 GuiDebuggerState> {
    private isa: Isa;
    private worker: Worker;

    constructor(props: GuiDebuggerProps) {
        super(props);

        this.isa = getIsa(this.props.isaName);
        this.state = {
            state: this.isa.initMachineState(),
        };

        (this.worker = new Worker(this.props.workerBundleUrl)).onerror =
            this.onError.bind(this);
        this.worker.onmessage = this.onMessage.bind(this);
        this.postMessage({ kind: 'reset', isa: this.props.isaName });
    }

    public componentDidUpdate(prevProps: GuiDebuggerProps) {
        // If ISA changed, reset the worker
        if (prevProps.isaName !== this.props.isaName) {
            this.isa = getIsa(this.props.isaName);
            this.setState({ state: this.isa.initMachineState() });
            this.postMessage({ kind: 'reset', isa: this.props.isaName });
        }
    }

    public onError(err: ErrorEvent) {
        console.log(err);
    }

    public onMessage(event: MessageEvent) {
        const msg: WorkerMessage = event.data;
        console.log('message from worker', msg);
    }

    public render() {
        return <h1>Hello, Becker!</h1>;
    }

    private postMessage(msg: FrontendMessage): void {
        this.worker.postMessage(msg);
    }
}
