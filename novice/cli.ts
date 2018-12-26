import * as fs from 'fs';
import { Writable } from 'stream';
import { Assembler, getParser } from './assembler';

async function main(args: string[], stdout: Writable, stderr: Writable):
        Promise<number> {
    const subcommand = args[0];

    switch (subcommand) {
        case 'asm-pass1':
            if (args.length === 3) {
                const parser = args[1];
                const path = args[2];
                return await asmPass1(parser, path, stdout, stderr);
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
    stderr.write('usage: novice asm-pass1 <parser> <file>\n' +
                 '       novice tablegen  <parser>\n');
    return 1;
}

async function asmPass1(parserName: string, path: string, stdout: Writable,
                        stderr: Writable): Promise<number> {
    try {
        const parser = getParser(parserName);
        const fp = fs.createReadStream(path);
        await new Promise((resolve, reject) => {
            fp.on('readable', resolve);
            fp.on('error', reject);
        });
        const assembly = await new Assembler(parser).parse(fp);
        stdout.write(JSON.stringify(assembly));
        return 0;
    } catch (err) {
        stderr.write(`asm-pass1 error: ${err.message}\n`);
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
