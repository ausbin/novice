import { FullMachineState, getIsa, Isa, fmtHex, Symbols, BaseSymbols } from 'novice';
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

export class GuiDebugger extends React.Component<GuiDebuggerProps,
                                                 GuiDebuggerState> {
    private isa: Isa;
    private symbols: Symbols;
    private worker: Worker;

    constructor(props: GuiDebuggerProps) {
        super(props);

        this.isa = getIsa(this.props.isaName);
        this.symbols = new BaseSymbols();
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
        const cols = [80, 80, 80, 200];
        const colVal: ((addr: number) => string)[] = [
            addr => this.fmtAddr(addr),
            addr => this.fmtWord(this.isa.stateLoad(this.state.state, addr)),
            addr => this.isa.stateLoad(this.state.state, addr).toString(10),
            addr => this.isa.disassemble(addr, this.isa.stateLoad(this.state.state, addr),
                                         this.symbols, true) || '',
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

    private fmtAddr(addr: number): string {
        return fmtHex(addr, this.isa.spec.mem.space);
    }

    private fmtWord(word: number): string {
        return fmtHex(word, this.isa.spec.mem.word);
    }
}
