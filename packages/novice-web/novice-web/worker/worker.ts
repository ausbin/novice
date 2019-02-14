const ctx: Worker = self as any;

ctx.onmessage = event => {
    ctx.postMessage(`gaming is ${event.data}`);
};
