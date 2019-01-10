import * as fs from 'fs';
import { Writable } from 'stream';
import { Assembler, getConfig, getParser } from './assembler';

async function main(args: string[], stdout: Writable,
                    stderr: Writable): Promise<number> {
    const subcommand = args[0];

    switch (subcommand) {
        case 'asm':
            if (args.length >= 2 && args.length <= 3) {
                const config = (args.length < 3) ? 'lc3' : args[1];
                const path = args[args.length - 1];
                return await asm(config, path, stdout, stderr);
            } else {
                return usage(stderr);
            }
        case 'tablegen':
            if (args.length === 2) {
                const parser = args[1];
                return tablegen(parser, stdout, stderr);
            } else {
                return usage(stderr);
            }
        default:
            return usage(stderr);
    }
}

function usage(stderr: Writable): number {
    stderr.write('usage: novice asm [config] <file>\n' +
                 '       novice tablegen <parser>\n');
    return 1;
}

async function asm(configName: string, path: string, stdout: Writable,
                   stderr: Writable):
        Promise<number> {
    try {
        const cfg = getConfig(configName);
        const fp = fs.createReadStream(path);
        await new Promise((resolve, reject) => {
            fp.on('readable', resolve);
            fp.on('error', reject);
        });
        const assembler = new Assembler(cfg);
        const machineCode = await assembler.assemble(fp);
        stdout.write(JSON.stringify(machineCode));
        return 0;
    } catch (err) {
        stderr.write(`asm error: ${err.message}\n`);
        return 1;
    }
}

function tablegen(parserName: string, stdout: Writable,
                  stderr: Writable): number {
    let table: object;
    try {
        const parser = getParser(parserName);
        table = parser.genTable();
    } catch (err) {
        stderr.write(`error generating LR(1) table: ${err.message}\n`);
        return 1;
    }

    stdout.write(JSON.stringify(table));
    return 0;
}

export default main;
