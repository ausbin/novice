import * as React from 'react';
import * as ReactDOM from 'react-dom';

import { GuiDebugger } from './components/GuiDebugger';

const WORKER_BUNDLE_URL = 'dist/worker.bundle.js';

ReactDOM.render(
    <GuiDebugger isaName='lc3' workerBundleUrl={WORKER_BUNDLE_URL} />,
    document.getElementById('example'),
);
