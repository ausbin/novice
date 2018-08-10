const kindsObj = {
    'int-decimal' : '',
    'int-hex'     : '',
    'reg'         : '',
    'pseudoop'    : '',
    'string'      : '',
    'char'        : '',
    'word'        : '',
    ':'           : '',
    '('           : '',
    ')'           : '',
    ','           : '',
};
type Kind = keyof typeof kindsObj;
const kinds = new Set(Object.keys(kindsObj) as Kind[]);

abstract class DFA {
    public abstract feed(c: string): void;
    public abstract isAlive(): boolean;
    public abstract getAcceptingLength(): number;
    public abstract reset(): void;
    public abstract getKind(): Kind | null;
}

export { DFA, Kind, kinds };
