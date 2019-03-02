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

type WorkerMessage = UpdatesMessage;

export { ResetMessage, LoadSectionsMessage, InterruptMessage, StepMessage,
         RunMessage, UpdatesMessage, FrontendMessage, WorkerMessage };
