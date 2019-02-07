interface Memory {
    load(addr: number): number;
    store(addr: number, val: number): void;
}

export { Memory };
