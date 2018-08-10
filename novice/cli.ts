import * as fs from 'fs';
import { Writable } from 'stream';
import { Assembler, genTable } from './assembler';

async function main(args: string[], stdout: Writable, stderr: Writable):
        Promise<number> {
    const subcommand = args[0];

    switch (subcommand) {
        case 'asm':
            if (args.length === 2) {
                const path = args[1];
                return await asm(path, stdout, stderr);
            } else {
                return usage(stderr);
            }
        case 'tablegen':
            if (args.length === 1) {
                return tablegen(stdout, stderr);
            } else {
                return usage(stderr);
            }
        default:
            return usage(stderr);
    }
}

function usage(stderr: Writable): number {
    stderr.write('usage: novice asm <file>\n' +
                 '       novice tablegen\n');
    return 1;
}

async function asm(path: string, stdout: Writable, stderr: Writable):
        Promise<number> {
    try {
        const fp = fs.createReadStream(path);
        await new Promise((resolve, reject) => {
            fp.on('readable', resolve);
            fp.on('error', reject);
        });
        const assembly = await new Assembler(fp).parse();
        stdout.write(JSON.stringify(assembly));
        return 0;
    } catch (err) {
        stderr.write(`asm error: ${err.message}\n`);
        return 1;
    }
}

function tablegen(stdout: Writable, stderr: Writable): number {
    let table: object;
    try {
        table = genTable();
    } catch (err) {
        stderr.write(`error generating LR(1) table: ${err.message}\n`);
        return 1;
    }

    stdout.write(JSON.stringify(table));
    return 0;
}

export default main;
