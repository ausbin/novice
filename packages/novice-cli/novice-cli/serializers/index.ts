import { ComplxObjectFileSerializer } from './complx';
import { Serializer } from './serializer';

const serializers: {[s: string]: new() => Serializer} = {
    lc3: ComplxObjectFileSerializer,
};

function getSerializer(serializerName: string): Serializer {
    if (!serializers.hasOwnProperty(serializerName)) {
        throw new Error(`no such serializer \`${serializerName}'`);
    }

    return new serializers[serializerName]();
}

export { serializers, Serializer, getSerializer };
