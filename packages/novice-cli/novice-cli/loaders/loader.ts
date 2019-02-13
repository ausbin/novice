import { Isa, Memory, Symbols } from 'novice';
import { Readable } from 'stream';

interface Loader {
    load(isa: Isa, fp: Readable, mem: Memory): Promise<void>;
    fileExt(): string;
    symbFileExt(): string;
    loadSymb(fp: Readable, symbols: Symbols): Promise<void>;
}

export { Loader };
