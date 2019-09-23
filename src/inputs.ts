import {Engine} from "./engine";
import {Dictionary, TypeDefinition} from "./types";
import {Expression} from "./expression";
import { Observable, ReplaySubject } from "rxjs";
import {LinkError} from "./errors";

export class Input extends Expression {
    line: number = 0;
    column: number = 0;

    constructor(public readonly name: string) {
        super(0, 0);
    }
}

export class Inputs {
    private inputs: Dictionary<Input> = {};
    constructor(public readonly engine: Engine) {

    }

    registerInput(name: string, type: TypeDefinition, sink: Observable<any>): void {
        if (this.input(name)) {
            throw new Error(`input ${name} is already registered`);
        }

        const inp = new Input(name);
        inp.typeDefinition = type;
        const p = new ReplaySubject(1);
        inp.sink = p;
        sink.subscribe(p);

        this.inputs[name] = inp;
    }

    registerInputReference(keyPath: string, type: string, line: number, column: number) {
        const inp = this.input(keyPath);
        if (!inp) throw new LinkError(line, column, `property ${keyPath} is not defined`);
        const def = this.engine.type(type);
        if (!def) throw new LinkError(line, column, `type ${type} is not defined`);

        if (inp.typeDefinition && inp.typeDefinition !== def) {
            throw new LinkError(line, column, `type for ${keyPath} is already set to ${inp.typeDefinition} while trying to set it to ${def}`);
        }

        inp.typeDefinition = def;
        inp.line = line;
        inp.column = column;
    }

    input(name: string): Input|null {
        return this.inputs[name];
    }
}