import { Readable } from 'stream';
import { Isa } from '../../isa';
import { Memory } from '../mem';

interface Loader {
    load(isa: Isa, fp: Readable, mem: Memory): void;
}

export { Loader };
