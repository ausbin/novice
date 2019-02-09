interface IO {
    getc(): Promise<number>;
    putc(c: number): void;
}

export { IO };
