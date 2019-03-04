import { FullMachineState, getIsa, Isa } from 'novice';
import * as React from 'react';
import { VariableSizeGrid as Grid } from 'react-window';
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

        switch (msg.kind) {
            case 'updates':
                const [state, _] = this.isa.stateApplyUpdates(
                    this.state.state, msg.updates);
                this.setState({ state });
                break;

            case 'putc':
                // TODO: actually display somehow
                console.log(String.fromCharCode(msg.c));
                break;

            default:
                const __: never = msg;
        }
    }

    public render() {
        const cols = [50, 50, 50, 200];
        const colVal: ((addr: number) => string)[] = [
            addr => addr.toString(16),
            addr => this.isa.stateLoad(this.state.state, addr).toString(16),
            addr => this.isa.stateLoad(this.state.state, addr).toString(10),
            addr => 'disassembled',
        ];

        const cell = (props: { columnIndex: number,
                               rowIndex: number,
                               style: React.CSSProperties }) => (
            <div style={props.style}>
                {colVal[props.columnIndex](props.rowIndex)}
            </div>
        );

        return (<Grid
            columnCount={cols.length}
            columnWidth={i => cols[i]}
            rowCount={Math.pow(2, this.isa.spec.mem.space)}
            rowHeight={i => 20}
            width={cols.reduce((acc, cur) => acc + cur) + 32}
            height={600}
        >{cell}</Grid>);
    }

    private postMessage(msg: FrontendMessage): void {
        this.worker.postMessage(msg);
    }
}
