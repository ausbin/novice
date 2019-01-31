import { Readable } from 'stream';
import { Isa, SymbTable } from '../../isa';
import { Memory } from '../mem';

interface Loader {
    load(isa: Isa, fp: Readable, mem: Memory): Promise<void>;
    symbFileExt(): string;
    loadSymb(fp: Readable, symbtable: SymbTable): Promise<void>;
}

export { Loader };
