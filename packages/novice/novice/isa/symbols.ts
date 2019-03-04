type SymbTable = {[s: string]: number};
type InvSymbTable = {[addr: number]: string[]};

interface Symbols {
    hasSymbol(symb: string): boolean;
    setSymbol(symb: string, addr: number): void;
    setSymbols(symbtable: SymbTable): void;
    getSymbolAddr(symb: string): number;
    getAddrSymbols(addr: number): string[];
}

class BaseSymbols implements Symbols {
    private symbTable: SymbTable;
    private invSymbTable: InvSymbTable;

    public constructor() {
        this.symbTable = {};
        this.invSymbTable = {};
    }

    public hasSymbol(symb: string): boolean {
        return symb in this.symbTable;
    }

    public setSymbol(symb: string, addr: number): void {
        if (this.hasSymbol(symb)) {
            const oldAddr = this.symbTable[symb];
            // update inverted
            const symbols = this.invSymbTable[oldAddr];
            symbols.splice(symbols.indexOf(symb), 1);
        }

        this.symbTable[symb] = addr;

        if (!(addr in this.invSymbTable)) {
            this.invSymbTable[addr] = [];
        }

        this.invSymbTable[addr].push(symb);
        // Determinism!
        this.invSymbTable[addr].sort();
    }

    public setSymbols(symbtable: SymbTable): void {
        for (const symb in symbtable) {
            this.setSymbol(symb, symbtable[symb]);
        }
    }

    public getSymbolAddr(symb: string): number {
        if (!(symb in this.symbTable)) {
            throw new Error(`no such symbol \`${symb}'`);
        }

        return this.symbTable[symb];
    }

    public getAddrSymbols(addr: number): string[] {
        if (!(addr in this.invSymbTable)) {
            return [];
        }

        return this.invSymbTable[addr];
    }

}

export { BaseSymbols, SymbTable, Symbols };
