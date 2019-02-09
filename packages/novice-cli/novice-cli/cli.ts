import { ArgumentParser } from 'argparse';
import * as fs from 'fs';
import { Assembler, CliDebugger, getConfig, getIsa, getParser, getSerializer,
         getSimulatorConfig, Simulator, SimulatorConfig } from 'novice';
import { Readable, Writable } from 'stream';
import { StreamIO } from './stream-io';

async function main(argv: string[], stdin: Readable, stdout: Writable,
                    stderr: Writable): Promise<number> {
    const parser = new ArgumentParser({ prog: 'novice', description: 'toy assembler' });
    const sub = parser.addSubparsers({ dest: 'subcmd',
                                       help: 'subcommand to run. try ' +
                                             '`novice subcmd --help\' for more info' });

    const asmParser = sub.addParser('asm', { description:
                                             'assemble to an object file' });
    asmParser.addArgument(['file'], { help: 'file to assemble' });
    asmParser.addArgument(['-c', '--config'],
                          { defaultValue: 'lc3',
                            help: 'assembler configuration to use. ' +
                                  'default: %(defaultValue)s' });
    asmParser.addArgument(['-o', '--output-file'],
                          { metavar: 'PATH',
                            dest: 'outputFile',
                            defaultValue: null,
                            help: 'path to output file. default: ' +
                                  'for input file X.asm, output to X.EXT, ' +
                                  'where EXT is the default extension for ' +
                                  'the selected output format' });
    asmParser.addArgument(['-f', '--output-format'],
                          { metavar: 'FMT',
                            dest: 'outputFormat',
                            defaultValue: null,
                            help: 'desired output format. default: ' +
                                  'the default output format for the ' +
                                  'the selected assembler configuration' });

    const simParser = sub.addParser('sim', { description:
                                             'simulate an assembly/object file' });
    simParser.addArgument(['file'], { help: 'assembly/object file to simulate' });
    simParser.addArgument(['-c', '--config'],
                          { defaultValue: 'lc3',
                            help: 'simulator configuration to use. ' +
                                  'default: %(defaultValue)s' });
    simParser.addArgument(['-x', '--max-exec'],
                          { dest: 'maxExec',
                            type: 'int',
                            defaultValue: 1 << 13,
                            help: 'max instructions to execute. pass -1 for ' +
                                  'no limit. default: %(defaultValue)s' });

    const dbgParser = sub.addParser('dbg', { description:
                                             'interactively debug an object file'});
    dbgParser.addArgument(['file'], { help: 'object file to debug' });
    dbgParser.addArgument(['-c', '--config'],
                          { defaultValue: 'lc3',
                            help: 'simulator configuration to use. ' +
                                  'default: %(defaultValue)s' });

    const tablegenParser = sub.addParser('tablegen');
    tablegenParser.addArgument(['parser'],
                               { help: 'parser whose table to generate' });

    const args = parser.parseArgs(argv);
    switch (args.subcmd) {
        case 'asm':
            return await asm(args.config, args.file, args.outputFile, args.outputFormat, stdout, stderr);
        case 'sim':
            return await sim(args.config, args.file, args.maxExec, stdin, stdout, stderr);
        case 'dbg':
            return await dbg(args.config, args.file, stdin, stdout, stderr);
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
        const symbPath = removeExt(outPath) + '.' + cfg.serializer.symbFileExt();

        const inFp = fs.createReadStream(inPath);
        await new Promise((resolve, reject) => {
            inFp.on('readable', resolve);
            inFp.on('error', reject);
        });
        const outFp = fs.createWriteStream(outPath);
        const symbFp = fs.createWriteStream(symbPath);
        const assembler = new Assembler(cfg);

        // Buffer so we don't make 1,000,000 syscalls
        outFp.cork();
        symbFp.cork();
        await assembler.assembleTo(inFp, outFp, symbFp);
        outFp.uncork();
        symbFp.uncork();
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

function hasObjectFileExt(path: string, cfg: SimulatorConfig) {
    return path.endsWith('.' + cfg.loader.fileExt());
}

async function sim(configName: string, path: string, maxExec: number,
                   stdin: Readable, stdout: Writable, stderr: Writable):
        Promise<number> {

    try {
        const cfg = getSimulatorConfig(configName);
        const fp = fs.createReadStream(path);
        await Promise.all([fp, stdin].map(
            f => new Promise((resolve, reject) => {
                f.on('readable', resolve);
                f.on('error', reject);
            }),
        ));

        const io = new StreamIO(stdin, stdout);
        const simulator = new Simulator(cfg.isa, io, maxExec);

        const isObjectFile = hasObjectFileExt(path, cfg);
        if (isObjectFile) {
            await cfg.loader.load(cfg.isa, fp, simulator);
        } else {
            const asmCfg = getConfig(configName);
            const assembler = new Assembler(asmCfg);
            const [symbtable, sections] = await assembler.assemble(fp);
            simulator.loadSections(sections);
        }

        await simulator.run();
        return 0;
    } catch (err) {
        stderr.write(`sim error: ${err.message}\n`);
        return 1;
    }
}

async function dbg(configName: string, path: string, stdin: Readable,
                   stdout: Writable, stderr: Writable): Promise<number> {
    let cfg;
    let fp: Readable;
    let symbFp: Readable|null = null;
    let isObjectFile: boolean;

    try {
        cfg = getSimulatorConfig(configName);
        isObjectFile = hasObjectFileExt(path, cfg);
        fp = fs.createReadStream(path);

        await new Promise((resolve, reject) => {
            fp.on('readable', resolve);
            fp.on('error', reject);
        });

        if (isObjectFile) {
            const symbPath = `${removeExt(path)}.${cfg.loader.symbFileExt()}`;
            symbFp = fs.createReadStream(symbPath);

            await new Promise((resolve, reject) => {
                (symbFp as Readable).on('readable', resolve);
                (symbFp as Readable).on('error', err => {
                    stderr.write(`warning: could not open symbol file ` +
                                 `\`${symbPath}'. reason: \`${err.message}'. ` +
                                 `proceeding without debug symbols...\n`);
                    symbFp = null;
                    resolve();
                });
            });
        }
    } catch (err) {
        stderr.write(`dbg: setup error: ${err.message}\n`);
        return 1;
    }

    const debug = new CliDebugger(cfg.isa, stdin, stdout);

    try {
        if (isObjectFile) {
            const loadPromise = cfg.loader.load(cfg.isa, fp, debug);
            if (symbFp) {
                await Promise.all([
                    loadPromise,
                    cfg.loader.loadSymb(symbFp, debug),
                ]);
            } else {
                await loadPromise;
            }
        } else {
            const asmCfg = getConfig(configName);
            const assembler = new Assembler(asmCfg);
            const [symbtable, sections] = await assembler.assemble(fp);
            debug.loadSections(sections);
            debug.setSymbols(symbtable);
        }

        await debug.run();
        debug.close();
        return 0;
    } catch (err) {
        debug.close();
        stderr.write(`dbg error: ${err.message}\n`);
        return 1;
    }
}

function tablegen(parserName: string, stdout: Writable,
                  stderr: Writable): number {
    let table: object;
    try {
        const parser = getParser(parserName, getIsa('dummy'));
        table = parser.genTable();
    } catch (err) {
        stderr.write(`error generating LR(1) table: ${err.message}\n`);
        return 1;
    }

    stdout.write(JSON.stringify(table));
    return 0;
}

export default main;
