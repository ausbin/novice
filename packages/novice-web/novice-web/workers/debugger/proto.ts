import { MachineCodeSection, MachineStateUpdate } from 'novice';

// Messages originating from frontend

interface ResetMessage {
    kind: 'reset';
    isa: string;
}

interface LoadSectionsMessage {
    kind: 'load-sections';
    sections: MachineCodeSection[];
}

interface InterruptMessage {
    kind: 'interrupt';
}

interface StepMessage {
    kind: 'step';
}

interface UnstepMessage {
    kind: 'unstep';
}

interface RunMessage {
    kind: 'run';
}

type DebuggerFrontendMessage = ResetMessage|LoadSectionsMessage|InterruptMessage|
                               StepMessage|UnstepMessage|RunMessage;

// Messages originating from worker

interface UpdatesMessage {
    kind: 'updates';
    updates: MachineStateUpdate[];
}

interface PutcMessage {
    kind: 'putc';
    c: number;
}

type DebuggerWorkerMessage = UpdatesMessage|PutcMessage;

export { DebuggerFrontendMessage, DebuggerWorkerMessage };
