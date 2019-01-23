import { IO } from '../isa';

class FakeIO implements IO {
    public stdin: string;
    public stdout: string;

    public constructor() {
        this.stdin = this.stdout = "";
    }

    public async getc() {
        if (this.stdin.length > 0) {
            const c = this.stdin.charCodeAt(0);
            this.stdin = this.stdin.slice(1);
            return c;
        } else {
            throw new Error('unexpected EOF on stdin');
        }
    }

    public putc(c: number) {
        this.stdout += String.fromCharCode(c);
    }
}

export { FakeIO };
