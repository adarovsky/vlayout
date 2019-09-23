import {Engine} from "./engine";
import {View} from "./view";
import {Button} from "./primitives";

export class Bindings {
    constructor(public readonly engine: Engine) {

    }

    registerSlot(name: string, type: string): void {
        const v = this.viewForKey(name);
        if (!v) {
            throw new Error(`view ${name} is not registered`);
        }

        if (type === 'button' && !(v instanceof Button)) {
            throw new Error(`view ${name} is not a button, but ${v.viewType()}`);
        }
    }

    viewForKey(key: string): View|null {
        return this.engine.viewForKey(key);
    }

    toString(): string {
        return 'bindings {\n}\n';
    }
}