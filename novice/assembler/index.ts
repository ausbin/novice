import { Assembler, AssemblerConfig } from './assembler';
import { BaseMachineCodeGenerator, MachineCodeGenerator } from './codegen';
import { configs } from './configs';
import { Isa, isas } from './isa';
import { opSpecs, PseudoOpSpec } from './opspec';
import { Parser, parsers } from './parsers';
import { Serializer, serializers } from './serializers';

function getParser(parserName: string): Parser {
    if (!parsers.hasOwnProperty(parserName)) {
        throw new Error(`no such parser \`${parserName}'\n`);
    }

    return new parsers[parserName]();
}

function getGenerator(): MachineCodeGenerator {
    // Go ahead and return only this lil fella for now
    return new BaseMachineCodeGenerator();
}

function getIsa(isaName: string): Isa {
    if (!isas.hasOwnProperty(isaName)) {
        throw new Error(`no such isa \`${isaName}'\n`);
    }

    return isas[isaName];
}

function getOpSpec(opSpecName: string): PseudoOpSpec {
    if (!opSpecs.hasOwnProperty(opSpecName)) {
        throw new Error(`no such opspec \`${opSpecName}'\n`);
    }

    return opSpecs[opSpecName];
}

function getSerializer(serializerName: string): Serializer {
    if (!serializers.hasOwnProperty(serializerName)) {
        throw new Error(`no such serializer \`${serializerName}'\n`);
    }

    return new serializers[serializerName]();
}

function getConfig(configName: string): AssemblerConfig {
    if (!configs.hasOwnProperty(configName)) {
        throw new Error(`no such assembler config \`${configName}'\n`);
    }

    const configNames = configs[configName];

    return {
        parser: getParser(configNames.parser),
        generator: getGenerator(),
        isa: getIsa(configNames.isa),
        opSpec: getOpSpec(configNames.opSpec),
        serializer: getSerializer(configNames.serializer),
    };
}

export { Assembler, getParser, getGenerator, getIsa, getOpSpec, getSerializer, getConfig };
