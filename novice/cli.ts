import { ArgumentParser } from 'argparse';
import * as fs from 'fs';
import { Writable } from 'stream';
import { Assembler, getConfig, getParser, getSerializer } from './assembler';

async function main(argv: string[], stdout: Writable,
                    stderr: Writable): Promise<number> {
    const parser = new ArgumentParser({ prog: 'novice', description: 'toy assembler' });
    const sub = parser.addSubparsers({ dest: 'subcmd', help: 'subcommand to run' });

    const asmParser = sub.addParser('asm');
    asmParser.addArgument(['file'], { help: 'file to assemble' });
    asmParser.addArgument(['-c', '--config'],
                          { defaultValue: 'lc3',
                            help: 'assembler configuration to use. ' +
                                  'default: %(defaultValue)s' });
    asmParser.addArgument(['-o', '--output-file'],
                          { metavar: 'PATH',
                            defaultValue: null,
                            help: 'path to output file. default: ' +
                                  'for input file X.asm, output to X.EXT, ' +
                                  'where EXT is the default extension for ' +
                                  'the selected output format' });
    asmParser.addArgument(['-f', '--output-format'],
                          { metavar: 'FMT',
                            defaultValue: null,
                            help: 'desired output format. default: ' +
                                  'the default output format for the ' +
                                  'the selected assembler configuration' });

    const tablegenParser = sub.addParser('tablegen');
    tablegenParser.addArgument(['parser'],
                               { help: 'parser whose table to generate' });

    const args = parser.parseArgs(argv);
    switch (args.subcmd) {
        case 'asm':
            return await asm(args.config, args.file, args.outputFile, args.outputFormat, stdout, stderr);
        case 'tablegen':
            return tablegen(args.parser, stdout, stderr);
        default:
            stderr.write(`novice: unsupported subcommand ${args.subcmd}\n`);
            return 1;
    }
}

async function asm(configName: string, inPath: string,
                   outPath: string|null, outFmt: string|null,
                   stdout: Writable, stderr: Writable):
        Promise<number> {
    try {
        const cfg = getConfig(configName);

        if (outFmt) {
            cfg.serializer = getSerializer(outFmt);
        }
        if (!outPath) {
            outPath = removeExt(inPath) + '.' + cfg.serializer.fileExt();
        }

        const inFp = fs.createReadStream(inPath);
        await new Promise((resolve, reject) => {
            inFp.on('readable', resolve);
            inFp.on('error', reject);
        });
        const outFp = fs.createWriteStream(outPath);
        const assembler = new Assembler(cfg);

        // Buffer so we don't make 1,000,000 syscalls
        outFp.cork();
        await assembler.assembleTo(inFp, outFp);
        outFp.uncork();
        outFp.end();

        return 0;
    } catch (err) {
        stderr.write(`asm error: ${err.message}\n`);
        return 1;
    }
}

function removeExt(path: string): string {
    const slashIdx = path.lastIndexOf('/');
    const dotIdx = path.lastIndexOf('.');
    const hasExt = dotIdx !== -1 && (slashIdx === -1 || slashIdx < dotIdx);
    return hasExt ? path.substr(0, dotIdx) : path;
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
