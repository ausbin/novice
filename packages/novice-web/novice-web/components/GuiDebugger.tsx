import * as React from 'react';
import { Isa, FullMachineState, initMachineState } from 'novice';

export interface GuiDebuggerProps {
    workerBundleUrl: string;
    isa: Isa;
}

export interface GuiDebuggerState {
    state: FullMachineState,
}

// State is never set so we use the '{}' type.
export class GuiDebugger extends React.Component<GuiDebuggerProps,
                                                 GuiDebuggerState> {
    private worker: Worker;

    constructor(props: GuiDebuggerProps) {
        super(props);

        this.state = {
            state: initMachineState(this.props.isa),
        };

        (this.worker = new Worker(this.props.workerBundleUrl)).onerror =
            this.onError.bind(this);
        this.worker.onmessage = this.onMessage.bind(this);
        this.worker.postMessage('incredible');
    }

    onError(err: ErrorEvent) {
        console.log(err);
    }

    onMessage(event: MessageEvent) {
        console.log(event.data);
    }

    render() {
        return <h1>Hello, Becker!</h1>;
    }
}
