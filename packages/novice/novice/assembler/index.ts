import { getIsa, Isa, isas } from '../isa';
import { Assembler, AssemblerConfig } from './assembler';
import { BaseMachineCodeGenerator, MachineCodeGenerator } from './codegen';
import { configs } from './configs';
import { opSpecs, PseudoOpSpec } from './opspec';
import { Parser, parsers } from './parsers';

function getParser(parserName: string, isa: Isa): Parser {
    if (!parsers.hasOwnProperty(parserName)) {
        throw new Error(`no such parser \`${parserName}'`);
    }

    return new parsers[parserName](isa);
}

function getGenerator(isa: Isa, opSpec: PseudoOpSpec): MachineCodeGenerator {
    // Go ahead and return only this lil fella for now
    return new BaseMachineCodeGenerator(isa, opSpec);
}

function getOpSpec(opSpecName: string): PseudoOpSpec {
    if (!opSpecs.hasOwnProperty(opSpecName)) {
        throw new Error(`no such opspec \`${opSpecName}'`);
    }

    return opSpecs[opSpecName];
}

function getConfig(configName: string): AssemblerConfig {
    if (!configs.hasOwnProperty(configName)) {
        throw new Error(`no such assembler config \`${configName}'`);
    }

    const configNames = configs[configName];
    const isa = getIsa(configNames.isa);
    const opSpec = getOpSpec(configNames.opSpec);

    return {
        parser: getParser(configNames.parser, isa),
        generator: getGenerator(isa, opSpec),
        isa,
        opSpec,
    };
}

export { Assembler, AssemblerConfig, getParser, getGenerator, getOpSpec,
         getConfig };
