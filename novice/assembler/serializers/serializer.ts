import { Writable } from 'stream';
import { Isa } from '../../isa';
import { MachineCodeSection } from '../codegen';

interface Serializer {
    serialize(isa: Isa, code: MachineCodeSection[], fp: Writable): void;
    // default file extension for this format. No leading dot please
    fileExt(): string;
}

export { Serializer };
