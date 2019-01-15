import { ComplxObjectFileLoader } from './complx';
import { Loader } from './loader';

const loaders: {[s: string]: new() => Loader} = {
    complx: ComplxObjectFileLoader,
};

export { Loader, loaders };
