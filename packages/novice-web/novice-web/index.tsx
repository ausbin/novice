import * as React from 'react';
import * as ReactDOM from 'react-dom';

import { GuiDebugger } from './components/GuiDebugger';

const SOURCE_CODE_LINK = 'https://github.com/ausbin/novice';
const DEBUGGER_WORKER_BUNDLE_URL = 'debuggerWorker.bundle.js';
const ASSEMBLER_WORKER_BUNDLE_URL = 'assemblerWorker.bundle.js';

ReactDOM.render(
    <GuiDebugger isaName='lc3'
                 initialAssemblyCode={'.orig x3000\n; write LC-3 assembly code here\n; and press "Assemble"\n\nhalt\n.end\n'}
                 sourceCodeLink={SOURCE_CODE_LINK}
                 debuggerWorkerBundleUrl={DEBUGGER_WORKER_BUNDLE_URL}
                 assemblerWorkerBundleUrl={ASSEMBLER_WORKER_BUNDLE_URL} />,
    document.getElementById('root'),
);
