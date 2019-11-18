import {Engine} from "./engine";
import {Dictionary, TypeDefinition} from "./types";
import {Expression} from "./expression";
import {Observable} from "rxjs";
import {LinkError} from "./errors";
import {distinctUntilChanged, filter, shareReplay, switchMap, tap} from "rxjs/operators";
import {pauseObserving, resumeObserving} from "./resize_sensor";

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
        inp.sink = sink.pipe(
            distinctUntilChanged(),
            tap( x => this.engine.logInputValue(name, x)),
            filter(x => {
                const correct = type.isTypeCorrect(x);
                if (!correct) {
                    console.error(`wrong type for input ${name}: expected value of type ${type.typeName}, got ${x}`);
                }

                return correct;
            }),
            switchMap( x => {
                return new Observable<typeof x>(subscriber => {
                    pauseObserving();
                    subscriber.next(x);
                    resumeObserving();
                    subscriber.complete();
                });
            }),
            shareReplay({bufferSize: 1, refCount: true} )
        );

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