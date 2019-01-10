interface Config {
    parser: string;
    isa: string;
    opSpec: string;
}

const configs: {[s: string]: Config} = {
    lc3: {
        parser: 'complx',
        isa: 'lc3',
        opSpec: 'complx',
    },
};

export { configs };
