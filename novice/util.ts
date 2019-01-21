function maskTo(val: number, bits: number): number {
    return val & ((bits === 32) ? -1 : ~(-1 << bits));
}

function sextTo(val: number, bits: number): number {
    return (bits === 32 || (val & (1 << (bits - 1))) === 0)
           ? val
           : val | (-1 << bits);
}

function padStr(str: string, to: number, withChar: string) {
    const need = to - str.length;
    for (let i = 0; i < need; i++) {
        str = withChar + str;
    }
    return str;
}

export { maskTo, sextTo, padStr };
