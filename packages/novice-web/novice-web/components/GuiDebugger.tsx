import { BaseSymbols, fmtBinOrHex, FullMachineState, getIsa, Isa, range, Symbols } from 'novice';
import * as React from 'react';
import { AssemblerFrontendMessage, AssemblerWorkerMessage } from '../workers/assembler';
import { DebuggerFrontendMessage, DebuggerWorkerMessage } from '../workers/debugger';
import { AssembleForm } from './AssembleForm';
import { MemoryView } from './MemoryView';

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

    public render() {
        // Be a little dishonest: to avoid confusing users, get 'stuck' on halts
        const pc = this.state.state.halted ? this.state.state.pc - this.isa.spec.pc.increment
                                           : this.state.state.pc;

        const registers = this.isa.spec.regs.map(reg => {
            let name = '';
            let values;

            if (reg.kind === 'reg-range') {
                name = 'range-' + reg.prefix;
                values = range(reg.count).map(i => (<div className='reg' key={name + i}>{
                    reg.prefix + i + ': ' + fmtBinOrHex(this.state.state.regs.range[reg.prefix][i], reg.bits)
                }</div>));
            } else if (reg.kind === 'reg') {
                name = 'solo-' + reg.name;
                values = (<div className='reg' key={name}>
                    {reg.name + ': '  + fmtBinOrHex(this.state.state.regs.solo[reg.name], reg.bits)}
                </div>);
            } else {
                const _: never = reg;
            }

            return (<div className='reg-family' key={'family-' + name}>{values}</div>);
        });

        return (
            <div className='gui-wrapper'>
                <div className='state-view'>
                    <div className='register-view'>
                        {registers}
                    </div>
                    <MemoryView colWidths={[20, 80, 80, 80, 200]}
                                rowHeight={20}
                                rows={30}
                                pc={this.state.state.pc}
                                memSpace={this.isa.spec.mem.space}
                                memWord={this.isa.spec.mem.word}
                                load={addr => this.isa.stateLoad(this.state.state, addr)}
                                disassemble={addr => this.isa.disassemble(
                                                         addr, this.isa.stateLoad(this.state.state,
                                                                                  addr),
                                                         this.symbols, true)} />
                </div>
                <AssembleForm initialAssemblyCode={this.props.initialAssemblyCode}
                              handleAssembleRequest={this.handleAssembleRequest}
                              handleStepRequest={this.handleStepRequest}
                              handleUnstepRequest={this.handleUnstepRequest}
                              handleContinueRequest={this.handleContinueRequest} />
            </div>
        );
    }

    private onError(err: ErrorEvent) {
        console.error(err);
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
}
