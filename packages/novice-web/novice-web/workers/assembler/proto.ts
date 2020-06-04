import { MachineCodeSection, SymbTable } from 'novice';

// Messages originating from frontend

interface AssembleMessage {
    kind: 'assemble';
    configName: string;
    assemblyCode: string;
}

type AssemblerFrontendMessage = AssembleMessage;

// Messages originating from worker

interface AssemblyFinishedMessage {
    kind: 'assembly-finished';
    symbtable: SymbTable;
    sections: MachineCodeSection[];
}

interface AssemblyErrorMessage {
    kind: 'assembly-error';
    errorMessage: string;
}
type AssemblerWorkerMessage = AssemblyFinishedMessage|AssemblyErrorMessage;

export { AssemblerFrontendMessage, AssemblerWorkerMessage };
