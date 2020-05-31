import { DebuggerWorker } from './debugger-worker';

const ctx: Worker = self as any;
new DebuggerWorker(ctx).register();
