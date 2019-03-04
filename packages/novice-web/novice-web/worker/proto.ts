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

interface RunMessage {
    kind: 'run';
}

type FrontendMessage = ResetMessage|LoadSectionsMessage|InterruptMessage|
                       StepMessage|RunMessage;

// Messages originating from worker

interface UpdatesMessage {
    kind: 'updates';
    updates: MachineStateUpdate[];
}

interface PutcMessage {
    kind: 'putc';
    c: number;
}

type WorkerMessage = UpdatesMessage|PutcMessage;

export { ResetMessage, LoadSectionsMessage, InterruptMessage, StepMessage,
         RunMessage, UpdatesMessage, PutcMessage, FrontendMessage,
         WorkerMessage };
