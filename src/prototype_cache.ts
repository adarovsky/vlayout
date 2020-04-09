import {ListItemPrototype} from "./list";

export class PrototypeCache {
    private storage = new Map<string, ListItemPrototype>();
    private unkeyed: ListItemPrototype[] = [];

    constructor(readonly capacity: number = 100) {
    }

    take(key: string): ListItemPrototype|undefined {
        let item = this.storage.get(key);
        if (item) {
            this.storage.delete(key);
        }
        else {
            item = this.unkeyed.shift();
        }
        this.cleanup();
        return item;
    }

    put(proto: ListItemPrototype) {
        if (proto.modelItemSnapshot?.id) {
            this.storage.set(proto.modelItemSnapshot.id, proto);
        }
        else {
            this.unkeyed.push(proto);
        }
        this.cleanup();
    }

    keys() {
        return this.storage.keys();
    }

    private cleanup() {
        while (this.storage.size > this.capacity) {
            const k = this.storage.keys().next().value;
            this.storage.delete(k);
        }

        while(this.unkeyed.length > this.capacity) {
            this.unkeyed.shift();
        }
    }
}
