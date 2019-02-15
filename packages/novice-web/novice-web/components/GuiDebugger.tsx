import * as React from "react";

export interface GuiDebuggerProps {
    bundleUrl: string;
}

// 'HelloProps' describes the shape of props.
// State is never set so we use the '{}' type.
export class GuiDebugger extends React.Component<GuiDebuggerProps, {}> {
    private worker: Worker;

    constructor(props: GuiDebuggerProps) {
        super(props);

        (this.worker = new Worker(this.props.bundleUrl)).onerror = this.onError.bind(this);
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
