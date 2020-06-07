import { AssemblerWorker } from './assembler-worker';

const ctx: Worker = self as any;
new AssemblerWorker(ctx).run();
