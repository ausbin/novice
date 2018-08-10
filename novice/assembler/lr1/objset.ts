interface Hashable {
    hash(): string;
}

class ObjSet<E extends Hashable> implements Hashable {
    private map: Map<string, E>;

    constructor(objs?: E[]) {
        if (objs) {
            this.map = new Map(
                objs.map(obj => [obj.hash(), obj]) as [string, E][]);
        } else {
            this.map = new Map();
        }
    }

    public add(obj: E): boolean {
        const hash = obj.hash();

        // Avoid clobbering existing values
        if (this.map.has(hash)) {
            return false;
        } else {
            this.map.set(hash, obj);
            return true;
        }
    }

    public has(obj: E): boolean {
        return this.map.has(obj.hash());
    }

    public get(obj: E): E | undefined {
        return this.map.get(obj.hash());
    }

    public forEach(callback: (obj: E) => void): void {
        this.map.forEach((obj, hash, map) => callback(obj));
    }

    public size(): number {
        return this.map.size;
    }

    public toArray(): E[] {
        return Array.from(this.map.values());
    }

    public hash(): string {
        return Array.from(this.map.keys()).sort().join('\n');
    }
}

export { ObjSet, Hashable };
