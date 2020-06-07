import { Assembler, getConfig, MachineCodeSection, SymbTable } from 'novice';
import { BaseWorker } from '../base-worker';
import { AssemblerFrontendMessage, AssemblerWorkerMessage } from './proto';

class AssemblerWorker extends BaseWorker<AssemblerFrontendMessage,
                                         AssemblerWorkerMessage> {

    public constructor(ctx: Worker) {
        super(ctx);
    }

    protected async onFrontendMessage(msg: AssemblerFrontendMessage): Promise<void> {
        switch (msg.kind) {
            case 'assemble':
                await this.assemble(msg.configName, msg.assemblyCode);
                break;

            // TODO: add never default again
        }
    }

    private async assemble(configName: string, assemblyCode: string): Promise<void> {
        const cfg = getConfig(configName);
        const assembler = new Assembler(cfg);

        let symbtable: SymbTable;
        let sections: MachineCodeSection[];

        try {
            [symbtable, sections] = await assembler.assembleString(assemblyCode);
        } catch (err) {
            this.sendWorkerMessage({kind: 'assembly-error', errorMessage: err.message});
            return;
        }

        this.sendWorkerMessage({kind: 'assembly-finished', symbtable, sections});
    }
}

export { AssemblerWorker };
