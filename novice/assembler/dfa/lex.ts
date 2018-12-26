function isWordChar(c: string): boolean {
    const charCode = c.charCodeAt(0);
    return isDecimalDigit(c) || c === '_' || c === '-' ||
           charCode >= 'a'.charCodeAt(0) && charCode <= 'z'.charCodeAt(0) ||
           charCode >= 'A'.charCodeAt(0) && charCode <= 'Z'.charCodeAt(0);

}

function isDecimalDigit(c: string): boolean {
    const charCode = c.charCodeAt(0);
    return charCode >= '0'.charCodeAt(0) && charCode <= '9'.charCodeAt(0);

}

function isHexDigit(c: string): boolean {
    const charCode = c.charCodeAt(0);
    return isDecimalDigit(c) ||
           charCode >= 'a'.charCodeAt(0) && charCode <= 'f'.charCodeAt(0) ||
           charCode >= 'A'.charCodeAt(0) && charCode <= 'F'.charCodeAt(0);
}

export { isWordChar, isDecimalDigit, isHexDigit };
