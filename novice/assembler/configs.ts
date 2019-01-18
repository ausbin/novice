interface Config {
    lexSpec: string;
    parser: string;
    isa: string;
    opSpec: string;
    serializer: string;
}

const configs: {[s: string]: Config} = {
    lc3: {
        lexSpec: 'complx',
        parser: 'complx',
        isa: 'lc3',
        opSpec: 'complx',
        serializer: 'complx',
    },
};

export { configs };
