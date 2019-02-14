import * as React from "react";

export interface HelloProps { compiler: string; framework: string; }

// 'HelloProps' describes the shape of props.
// State is never set so we use the '{}' type.
export class Hello extends React.Component<HelloProps, {}> {
    private worker: Worker;

    constructor(props: HelloProps) {
        super(props);

        (this.worker = new Worker('dist/worker.bundle.js')).onerror = this.onError.bind(this);
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
        return <h1>Hello from {this.props.compiler} and {this.props.framework}!</h1>;
    }
}
