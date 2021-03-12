import { TypeDefinition } from './types';
import { EMPTY, Observable } from 'rxjs';
import { Expression } from './expression';

export class BuiltinProperty extends Expression {
    constructor(readonly keyPath: string, readonly typeDefinition: TypeDefinition, readonly sink: Observable<any>) {
        super(0, 0);
    }

    instantiate(): this {
        const v = new (this.constructor as typeof BuiltinProperty)(this.keyPath, this.typeDefinition, this.sink);
        return v as this;
    }

    toString(): string {
        return this.keyPath;
    }
}
