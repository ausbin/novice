import * as React from 'react';
import * as ReactDOM from 'react-dom';

import { GuiDebugger } from './components/GuiDebugger';

const DEBUGGER_WORKER_BUNDLE_URL = 'dist/debuggerWorker.bundle.js';
const ASSEMBLER_WORKER_BUNDLE_URL = 'dist/assemblerWorker.bundle.js';

ReactDOM.render(
    <GuiDebugger isaName='lc3'
                 initialAssemblyCode={'; write LC-3 assembly code here\n'}
                 debuggerWorkerBundleUrl={DEBUGGER_WORKER_BUNDLE_URL}
                 assemblerWorkerBundleUrl={ASSEMBLER_WORKER_BUNDLE_URL} />,
    document.getElementById('root'),
);
