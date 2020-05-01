import { Engine } from 'engine';
import { View } from 'view';
import { Button, TextField } from 'primitives';

export class Bindings {
    constructor(public readonly engine: Engine) {

    }

    registerSlot(name: string, type: string): void {
        if (type === 'listButton' && this.engine.listButtonForKey(name))
            return;

        if (type === 'listTextField' && this.engine.listTextFieldForKey(name))
            return;

        if (type === 'listView' && this.engine.listViewForKey(name))
            return;

        const v = this.viewForKey(name);
        if (!v) {
            throw new Error(`view ${name} is not registered`);
        }

        if (type === 'button' && !(v instanceof Button)) {
            throw new Error(`view ${name} is not a button, but ${v.viewType()}`);
        }

        if (type === 'textField' && !(v instanceof TextField)) {
            throw new Error(`view ${name} is not a text field, but ${v.viewType()}`);
        }
    }

    viewForKey(key: string): View | null {
        return this.engine.viewForKey(key);
    }

    toString(): string {
        return 'bindings {\n}\n';
    }
}
