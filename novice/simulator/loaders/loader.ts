import { Readable } from 'stream';
import { Isa } from '../../isa';
import { Memory } from '../mem';
import { Symbols } from '../symbols';

interface Loader {
    load(isa: Isa, fp: Readable, mem: Memory): Promise<void>;
    fileExt(): string;
    symbFileExt(): string;
    loadSymb(fp: Readable, symbols: Symbols): Promise<void>;
}

export { Loader };
