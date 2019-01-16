import { ComplxObjectFileLoader } from './complx';
import { Loader } from './loader';

const loaders: {[s: string]: new() => Loader} = {
    complx: ComplxObjectFileLoader,
};

function getLoader(loaderName: string): Loader {
    if (!loaders.hasOwnProperty(loaderName)) {
        throw new Error(`no such loader \`${loaderName}'\n`);
    }

    return new loaders[loaderName]();
}

export { Loader, getLoader };
