import { SymbTable, isas } from '../../isa';
import { Loader } from './loader';
import { ComplxObjectFileLoader } from './complx';
import { Readable } from 'stream';
import { Memory } from '../mem';

interface Mem extends Memory {
    data: {[n: number]: number};
}

describe('complx loader', () => {
    let fp: Readable;
    let loader: Loader;

    beforeEach(() => {
        loader = new ComplxObjectFileLoader();
    });

    describe('load()', () => {
        let mem: Mem;

        beforeEach(() => {
            fp = new Readable();
            mem = {
                data: {},
                load: (addr: number) =>
                      mem.data.hasOwnProperty(addr)? mem.data[addr] : 0,
                store: (addr: number, val: number) =>
                       mem.data[addr] = val,
            };
        });

        it('loads trivial object file', () => {
            fp.push(new Uint8Array([
                0x30,0x00,
                0x00,0x01,
                0x13,0x37,
            ]));
            fp.push(null);

            return loader.load(isas.lc3, fp, mem).then(() => {
                expect(mem.data).toEqual({
                    0x3000: 0x1337,
                });
            });
        });

        it('loads larger object file', () => {
            fp.push(new Uint8Array([
                0x30,0x00,
                0x00,0x04,
                0x13,0x37,
                0x69,0x69,
                0xde,0xad,
                0xbe,0xef,
            ]));
            fp.push(null);

            return loader.load(isas.lc3, fp, mem).then(() => {
                expect(mem.data).toEqual({
                    0x3000: 0x1337,
                    0x3001: 0x6969,
                    0x3002: 0xdead,
                    0x3003: 0xbeef,
                });
            });
        });

        it('loads multiple sections', () => {
            fp.push(new Uint8Array([
                0x30,0x00,
                0x00,0x02,
                0x13,0x37,
                0x69,0x69,

                0x40,0x00,
                0x00,0x03,
                0x04,0x20,
                0xde,0xad,
                0xbe,0xef,
            ]));
            fp.push(null);

            return loader.load(isas.lc3, fp, mem).then(() => {
                expect(mem.data).toEqual({
                    0x3000: 0x1337,
                    0x3001: 0x6969,
                    0x4000: 0x0420,
                    0x4001: 0xdead,
                    0x4002: 0xbeef,
                });
            });
        });

        it('loads empty section', () => {
            fp.push(new Uint8Array([
                0x40,0x00,
                0x00,0x00,
                0x30,0x00,
                0x00,0x01,
                0x69,0x69,
            ]));
            fp.push(null);

            return loader.load(isas.lc3, fp, mem).then(() => {
                expect(mem.data).toEqual({
                    0x3000: 0x6969,
                });
            });
        });

        it('loads flaky stream', () => {
            fp = new Readable({
                objectMode: true,
            });
            fp.push(Buffer.from([0x30]));
            fp.push(Buffer.from([0x00]));
            fp.push(Buffer.from([0x00]));
            fp.push(Buffer.from([0x05]));
            fp.push(Buffer.from([0x13, 0x37]));
            fp.push(Buffer.from([0x69, 0x69, 0x04]));
            fp.push(Buffer.from([0x20]));
            fp.push(Buffer.from([0xde, 0xad, 0xbe]));
            fp.push(Buffer.from([0xef]));
            fp.push(null);

            return loader.load(isas.lc3, fp, mem).then(() => {
                expect(mem.data).toEqual({
                    0x3000: 0x1337,
                    0x3001: 0x6969,
                    0x3002: 0x0420,
                    0x3003: 0xdead,
                    0x3004: 0xbeef,
                });
            });
        });

        it('errors on too few words', () => {
            fp.push(new Uint8Array([
                0x30,0x00,
                0x00,0x02,
                0x13,0x37,
            ]));
            fp.push(null);

            return expect(loader.load(isas.lc3, fp, mem)).rejects.toThrow('expected 1 more words');
        });

        it('errors on odd number of bytes', () => {
            fp.push(new Uint8Array([
                0x30,0x00,
                0x00,0x01,
                0x13,0x37,
                0x69,
            ]));
            fp.push(null);

            return expect(loader.load(isas.lc3, fp, mem)).rejects.toThrow('not divisible by 2');
        });

        it('errors on malformed object file', () => {
            fp.push(new Uint8Array([
                0x40,0x00,
            ]));
            fp.push(null);

            return expect(loader.load(isas.lc3, fp, mem)).rejects.toThrow('unexpected end-of-file');
        });
    });

    describe('fileExt()', () => {
        it('returns the right file extension', () => {
            expect(loader.fileExt()).toEqual('obj');
        });
    });

    describe('symbFileExt()', () => {
        it('returns the right file extension', () => {
            expect(loader.symbFileExt()).toEqual('sym');
        });
    });

    describe('loadSymb()', () => {
        let symbTable: SymbTable;

        beforeEach(() => {
            fp = new Readable({
                objectMode: true,
            });
            symbTable = {};
        });

        it('loads basic table', () => {
            [
                '69\tdais',
                'yy\n420\tmarley\n',
                '3000\tstart\n34',
                '34\tgwen\n4000\tumbrella\n',
            ].forEach(s => fp.push(Buffer.from(s)));
            fp.push(null);

            return loader.loadSymb(fp, symbTable).then(() => {
                expect(symbTable).toEqual({
                    daisyy:   0x69,
                    marley:   0x420,
                    start:    0x3000,
                    gwen:     0x3434,
                    umbrella: 0x4000,
                });
            });
        });

        it('handles two labels with same address', () => {
            [
                '69\tbob1\n69\tbob2',
            ].forEach(s => fp.push(Buffer.from(s)));
            fp.push(null);

            return loader.loadSymb(fp, symbTable).then(() => {
                expect(symbTable).toEqual({
                    bob1: 0x69,
                    bob2: 0x69,
                });
            });
        });

        it('handles empty table', () => {
            fp.push(null);

            return loader.loadSymb(fp, symbTable).then(() => {
                expect(symbTable).toEqual({});
            });
        });

        it('ignores empty lines', () => {
            [
                '\n21\tsavage\n\n',
                '\n\n\n\n420\tbob',
            ].forEach(s => fp.push(Buffer.from(s)));
            fp.push(null);

            return loader.loadSymb(fp, symbTable).then(() => {
                expect(symbTable).toEqual({
                    savage: 0x21,
                    bob:    0x420,
                });
            });
        });

        it('errors on overlong string', () => {
            [
                'scooby'.repeat(1024),
            ].forEach(s => fp.push(Buffer.from(s)));
            fp.push(null);

            return expect(loader.loadSymb(fp, symbTable)).rejects.toThrow(/exceeds.*on line 1$/);
        });

        it('errors on overlong line', () => {
            [
                '3434\tasdfasdfasdf\n',
                'scooby'.repeat(1024) + '\n',
            ].forEach(s => fp.push(Buffer.from(s)));
            fp.push(null);

            return expect(loader.loadSymb(fp, symbTable)).rejects.toThrow(/exceeds.*on line 2$/);
        });

        it('errors on nonempty line without tab', () => {
            [
                '3434\tasdfasdfasdf\n',
                '3434asdfasdfasdf\n',
                '34\tadfasdf\n',
            ].forEach(s => fp.push(Buffer.from(s)));
            fp.push(null);

            return expect(loader.loadSymb(fp, symbTable)).rejects.toThrow(/tabs.*on line 2$/);
        });

        it('errors on negative address', () => {
            [
                '-4\tasdf\n',
            ].forEach(s => fp.push(Buffer.from(s)));
            fp.push(null);

            return expect(loader.loadSymb(fp, symbTable)).rejects.toThrow(/negative.*on line 1$/);
        });

        it('errors on non-hex address', () => {
            [
                'x4\tasdf\n',
            ].forEach(s => fp.push(Buffer.from(s)));
            fp.push(null);

            return expect(loader.loadSymb(fp, symbTable)).rejects.toThrow(/`x4'.*on line 1$/);
        });

        it('errors duplicate symbol', () => {
            [
                '0\tgaming\n',
                '3000\tgaming\n',
            ].forEach(s => fp.push(Buffer.from(s)));
            fp.push(null);

            return expect(loader.loadSymb(fp, symbTable)).rejects.toThrow(/`gaming'.*on line 2$/);
        });
    });
});
