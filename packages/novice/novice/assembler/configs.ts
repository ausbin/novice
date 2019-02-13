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
    lc2200: {
        parser: 'lc2200',
        isa: 'lc2200',
        opSpec: 'word',
    },
    rama2200: {
        parser: 'lc2200',
        isa: 'rama2200',
        opSpec: 'word',
    },
};

export { configs };
