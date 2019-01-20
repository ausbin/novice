function maskTo(val: number, bits: number): number {
    return val & ((bits === 32) ? -1 : ~(-1 << bits));
}

export { maskTo };
