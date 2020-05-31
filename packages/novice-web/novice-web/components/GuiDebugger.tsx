import { FullMachineState, getIsa, Isa, fmtHex, Symbols, BaseSymbols } from 'novice';
import * as React from 'react';
import { VariableSizeGrid as Grid } from 'react-window';
import { AssemblerFrontendMessage, AssemblerWorkerMessage } from '../workers/assembler';
import { DebuggerFrontendMessage, DebuggerWorkerMessage } from '../workers/debugger';
import { AssembleForm } from './AssembleForm';

export interface GuiDebuggerProps {
    debuggerWorkerBundleUrl: string;
    assemblerWorkerBundleUrl: string;
    isaName: string;
    initialAssemblyCode: string;
}

export interface GuiDebuggerState {
    state: FullMachineState;
}

export class GuiDebugger extends React.Component<GuiDebuggerProps,
                                                 GuiDebuggerState> {
    private isa: Isa;
    private symbols: Symbols;
    private debuggerWorker: Worker;
    private assemblerWorker: Worker;

    constructor(props: GuiDebuggerProps) {
        super(props);

        this.isa = getIsa(this.props.isaName);
        this.symbols = new BaseSymbols();
        this.state = {
            state: this.isa.initMachineState(),
        };

        this.onError = this.onError.bind(this);
        this.onDebuggerMessage = this.onDebuggerMessage.bind(this);
        this.onAssemblerMessage = this.onAssemblerMessage.bind(this);
        this.handleAssembleRequest = this.handleAssembleRequest.bind(this);
        this.handleStepRequest = this.handleStepRequest.bind(this);
        this.handleUnstepRequest = this.handleUnstepRequest.bind(this);
        this.handleContinueRequest = this.handleContinueRequest.bind(this);

        this.debuggerWorker = this.loadWorkerBundle(this.props.debuggerWorkerBundleUrl,
                                                    this.onDebuggerMessage);
        this.assemblerWorker = this.loadWorkerBundle(this.props.assemblerWorkerBundleUrl,
                                                     this.onAssemblerMessage);

        this.postDebuggerMessage({ kind: 'reset', isa: this.props.isaName });
    }

    public componentDidUpdate(prevProps: GuiDebuggerProps) {
        // If ISA changed, reset the worker
        if (prevProps.isaName !== this.props.isaName) {
            this.isa = getIsa(this.props.isaName);
            this.setState({ state: this.isa.initMachineState() });
            this.postDebuggerMessage({ kind: 'reset', isa: this.props.isaName });
        }
    }

    private onError(err: ErrorEvent) {
        console.log(err);
    }

    private onDebuggerMessage(msg: DebuggerWorkerMessage) {
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

    private onAssemblerMessage(msg: AssemblerWorkerMessage) {
        switch (msg.kind) {
            case 'assembly-finished':
                const sections = msg.sections;
                this.postDebuggerMessage({ kind: 'load-sections', sections });
                break;

            case 'assembly-error':
                const errorMessage = msg.errorMessage;
                console.error('assembly error in frontend', errorMessage);
                break;

            default:
                const __: never = msg;
        }
    }

    public render() {
        const rowHeight = 20;
        const cols = [20, 80, 80, 80, 200];
        const colVal: ((addr: number) => string)[] = [
            addr => (this.state.state.pc == addr)? '►' : '',
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

        return (
            <div className='gui-wrapper'>
                <div className='memory-view'>
                    <Grid columnCount={cols.length}
                          columnWidth={i => cols[i]}
                          rowCount={Math.pow(2, this.isa.spec.mem.space)}
                          rowHeight={i => rowHeight}
                          width={cols.reduce((acc, cur) => acc + cur) + 32}
                          height={600}
                          initialScrollTop={this.state.state.pc * rowHeight}>{cell}</Grid>
                </div>
                <AssembleForm initialAssemblyCode={this.props.initialAssemblyCode}
                              handleAssembleRequest={this.handleAssembleRequest}
                              handleStepRequest={this.handleStepRequest}
                              handleUnstepRequest={this.handleUnstepRequest}
                              handleContinueRequest={this.handleContinueRequest} />
            </div>
        );
    }

    private loadWorkerBundle<WorkerMessageType>(workerBundleUrl: string,
                                                onMessage: (msg: WorkerMessageType) => void): Worker {
        const worker = new Worker(workerBundleUrl);
        worker.onerror = this.onError;
        worker.onmessage = (e: MessageEvent) => {
            const msg: WorkerMessageType = e.data;
            onMessage(msg);
        };
        return worker;
    }

    private postDebuggerMessage(msg: DebuggerFrontendMessage): void {
        this.debuggerWorker.postMessage(msg);
    }

    private postAssemblerMessage(msg: AssemblerFrontendMessage): void {
        this.assemblerWorker.postMessage(msg);
    }

    private handleAssembleRequest(assemblyCode: string): void {
        // TODO: it's a hack to assume isa name == assembler config name
        this.postAssemblerMessage({ kind: 'assemble',
                                    configName: this.props.isaName,
                                    assemblyCode });
    }

    private handleStepRequest(): void {
        this.postDebuggerMessage({ kind: 'step' });
    }

    private handleUnstepRequest(): void {
        this.postDebuggerMessage({ kind: 'unstep' });
    }

    private handleContinueRequest(): void {
        this.postDebuggerMessage({ kind: 'run' });
    }

    private fmtAddr(addr: number): string {
        return fmtHex(addr, this.isa.spec.mem.space);
    }

    private fmtWord(word: number): string {
        return fmtHex(word, this.isa.spec.mem.word);
    }
}
