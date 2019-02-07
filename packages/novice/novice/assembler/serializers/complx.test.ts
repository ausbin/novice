import { Serializer } from './serializer';
import { ComplxObjectFileSerializer } from './complx';

// For more tests, see the assembler tests for lc3
describe('complx serializer', () => {
    let serializer: Serializer;

    beforeEach(() => {
        serializer = new ComplxObjectFileSerializer();
    });

    it('has the right obj file extension', () => {
        expect(serializer.fileExt()).toEqual('obj');
    });

    it('has the right sym file extension', () => {
        expect(serializer.symbFileExt()).toEqual('sym');
    });
});
