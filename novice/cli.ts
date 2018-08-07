import { Writable } from 'stream';

function main(args: string[], stderr: Writable) : number {
    let subcommand = args[0];

    switch (subcommand) {
        case 'asm':
            if (args.length === 2) {
                let path = args[1];
                return asm(path, stderr);
            } else {
                return usage(stderr);
            }
        default:
            return usage(stderr);
    }
}

function usage(stderr: Writable) : number {
    stderr.write('usage: novice asm <file>\n');
    return 1;
}

function asm(path: string, stderr: Writable) : number {
    stderr.write('assembling ' + path + '\n');
    return 0;
}

export default main;
