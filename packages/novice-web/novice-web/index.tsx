import * as React from 'react';
import * as ReactDOM from 'react-dom';

import { getIsa } from 'novice';

import { GuiDebugger } from './components/GuiDebugger';

const WORKER_BUNDLE_URL = 'dist/worker.bundle.js';

ReactDOM.render(
    <GuiDebugger isa={getIsa('lc3')} workerBundleUrl={WORKER_BUNDLE_URL} />,
    document.getElementById("example")
);
