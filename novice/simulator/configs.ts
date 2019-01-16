import { getIsa, Isa } from '../isa';
import { getLoader, Loader } from './loaders';

interface Config {
    isa: string;
    loader: string;
}

const configs: {[s: string]: Config} = {
    lc3: {
        isa: 'lc3',
        loader: 'complx',
    },
};

interface SimulatorConfig {
    isa: Isa;
    loader: Loader;
}

function getSimulatorConfig(configName: string): SimulatorConfig {
    if (!configs.hasOwnProperty(configName)) {
        throw new Error(`no such simulator config \`${configName}'\n`);
    }

    const config = configs[configName];

    return {
        isa: getIsa(config.isa),
        loader: getLoader(config.loader),
    };
}

export { SimulatorConfig, getSimulatorConfig };
