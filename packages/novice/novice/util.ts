export function maskTo(val: number, bits: number): number {
    return val & ((bits === 32) ? -1 : ~(-1 << bits));
}

export function sextTo(val: number, bits: number): number {
    return (bits === 32 || (val & (1 << (bits - 1))) === 0)
           ? val
           : val | (-1 << bits);
}

export function maxUnsignedVal(bits: number): number {
    // Need to do this instead of using bitwise operators to get around
    // the fact that js bitwise operators work on 32-bit two's complement ints
    return Math.pow(2, bits) - 1;
}

// 0x80000001 & 0xffffffff = -0x7fffffff in js. This is pretty confusing
// behavior when dealing with 32-bit addresses, so get the expected
// value by clearing the MSB and then adding 2^31 to set it again.
export function forceUnsigned(val: number, bits: number): number {
    return (bits < 32 || !(val & (1 << 31))) ? val : (val & ~(1 << 31)) + Math.pow(2, 31);
}

export function padStr(str: string, to: number, withChar: string, right?: boolean) {
    const need = to - str.length;
    for (let i = 0; i < need; i++) {
        str = right ? str + withChar : withChar + str;
    }
    return str;
}

export function fmtHex(val: number, bits: number): string {
    return '0x' + padStr(forceUnsigned(val, bits).toString(16),
                         Math.ceil(bits / 4), '0');
}

export function fmtBin(val: number, bits: number): string {
    return '0b' + padStr(forceUnsigned(val, bits).toString(2), bits, '0');
}

export function fmtBinOrHex(val: number, bits: number): string {
    return (bits <= 4) ? fmtBin(val, bits) : fmtHex(val, bits);
}

export function range(n: number): number[] {
    return [...new Array(n).keys()];
}
