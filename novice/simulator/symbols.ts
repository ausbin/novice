import { SymbTable } from '../isa';

interface Symbols {
    hasSymbol(symb: string): boolean;
    setSymbol(symb: string, addr: number): void;
    setSymbols(symbtable: SymbTable): void;
    getSymbolAddr(symb: string): number;
    getAddrSymbols(addr: number): string[];
}

export { Symbols };
