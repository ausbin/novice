import { ComplxObjectFileSerializer } from './complx';
import { Serializer } from './serializer';

const serializers: {[s: string]: new() => Serializer} = {
    complx: ComplxObjectFileSerializer,
};

export { serializers, Serializer };
