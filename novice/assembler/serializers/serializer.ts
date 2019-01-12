import { Writable } from 'stream';
import { MachineCodeSection } from '../codegen';
import { Isa } from '../isa';

interface Serializer {
    serialize(isa: Isa, code: MachineCodeSection[], fp: Writable): void;
    // default file extension for this format. No leading dot please
    fileExt(): string;
}

export { Serializer };
