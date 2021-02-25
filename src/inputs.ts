import { Engine } from './engine';
import { Dictionary, ListDefinition, TypeDefinition } from './types';
import { Expression } from './expression';
import { BehaviorSubject, concat, Observable, throwError, TimeoutError } from 'rxjs';
import { LinkError } from './errors';
import {
    catchError,
    distinctUntilChanged,
    filter,
    map,
    shareReplay,
    skip,
    switchMap,
    take,
    tap,
    timeout,
} from 'rxjs/operators';
import { isEqual } from 'lodash';

export class Input extends Expression {
    line: number = 0;
    column: number = 0;

    constructor(public readonly name: string) {
        super(0, 0);
    }
}

export class Inputs {
    public readonly inputIsUpdating = new BehaviorSubject(false);

    constructor(public readonly engine: Engine) {

    }
    registerInput(name: string, type: TypeDefinition, sink: Observable<any>): void {
        if (this.input(name, 0, 0)) {
            throw new Error(`input ${name} is already registered`);
        }

        const inp = new Input(name);
        inp.typeDefinition = type;
        inp.sink = sink.pipe(
            distinctUntilChanged(),
            tap( x => this.engine.logInputValue(name, x)),
            filter(x => {
                // pass through everything in release mode
                if (!this.engine.debug) {
                    return true;
                }
                const correct = type.isTypeCorrect(x);
                if (!correct) {
                    console.error(`wrong type for input ${name}: expected value of type ${type.typeName}, got ${x}`);
                }

                return correct;
            }),
            switchMap( x => {
                return new Observable<typeof x>(subscriber => {
                    this.inputIsUpdating.next(true);
                    subscriber.next(x);
                    subscriber.complete();
                    this.inputIsUpdating.next(false);
                });
            }),
            shareReplay({bufferSize: 1, refCount: true} )
        );

        if (this.engine.debug) {
            const head = inp.sink.pipe(
                take(1),
                timeout(1000),
                catchError(err => {
                    if (err instanceof TimeoutError) {
                        console.error(`inconsistency for input ${name}: no value came in 1s`);
                        return throwError(new Error(`inconsistency for input ${name}: no value came in 1s`));
                    }
                    else {
                        return throwError(err);
                    }
                })
            );
            const tail = inp.sink.pipe(
                skip(1)
            )
            inp.sink = concat(head, tail);
        }

        this.inputs[name] = inp;
    }

    registerInputReference(keyPath: string, type: string, line: number, column: number) {
        const inp = this.input(keyPath, line, column);
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

    input(name: string, line: number, column: number): Input | null {
        const input = this.inputs[name];
        if (input) return input;

        const match = name.match(/^(.*)\.count$/);
        if (match) {
            const source = match[1];
            const collection = this.inputs[source];
            if (collection) {
                if (collection.typeDefinition instanceof ListDefinition) {
                    const i = new Input(name);
                    i.typeDefinition = this.engine.numberType();
                    i.sink = collection.sink.pipe(map(arr => arr.length));
                    return i;
                }
                else {
                    throw new LinkError(line, column, `type for ${name} is not list: got ${collection.typeDefinition} instead`);
                }
            }
        }

        return null;
    }

    private inputs: Dictionary<Input> = {};
}
