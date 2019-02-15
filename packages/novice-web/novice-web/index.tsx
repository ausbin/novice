import * as React from 'react';
import * as ReactDOM from 'react-dom';

import { GuiDebugger } from './components/GuiDebugger';

const BUNDLE_URL = 'dist/worker.bundle.js';

ReactDOM.render(
    <GuiDebugger bundleUrl={BUNDLE_URL} />,
    document.getElementById("example")
);
