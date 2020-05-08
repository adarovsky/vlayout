import { Expression } from './expression';
import { LexIdentifier } from './lexer';
import { TypeDefinition } from './types';
import { FunctionImplementationI } from './builtin_functions';
import { Layout, Scope } from './layout';
import { Engine } from './engine';
import { Observable } from 'rxjs';
import { View } from './view';
import { isEqual } from 'lodash';

class FunctionArgument extends Expression {
    typeDefinition: TypeDefinition | null = null;

    constructor(readonly name: LexIdentifier, readonly type: string) {
        super(name.line, name.column);
    }

    link(scope: Scope, hint: TypeDefinition | null): void {
        this.typeDefinition = scope.engine.type(this.type);
        if (!this.typeDefinition) {
            throw new Error(`${this.line}:${this.column}: cannot resolve type ${this.type}`);
        }
    }
}

export class FunctionDeclaration implements Scope, FunctionImplementationI {
    name: string;
    line: number;
    column: number;
    arguments: FunctionArgument[] = [];
    expression: Expression|null = null;
    returnType: TypeDefinition;
    constructor(name: LexIdentifier, readonly layout: Layout) {
        this.name = name.content;
        this.line = name.line;
        this.column = name.column;
        this.returnType = layout.engine.boolType();
    }

    addArgument(name: LexIdentifier, type: string) {
        this.arguments.push(new FunctionArgument(name, type));
    }

    get engine(): Engine {
        return this.layout.engine;
    }

    functionFor(name: string, parameters: TypeDefinition[]): FunctionImplementationI {
        return this.layout.functionFor(name, parameters);
    }
    functionsLoose(name: string, parametersCount: number): FunctionImplementationI[] {
        return this.layout.functionsLoose(name, parametersCount);
    }

    variableForKeyPath(keyPath: string): Expression | null {
        const kp = keyPath.split('.');
        if (kp.length !== 1) return this.engine.variableForKeyPath(keyPath);

        return this.arguments.find(x => x.name.content === kp[0]) || this.layout.variableForKeyPath(keyPath);
    }

    get parameterTypes(): TypeDefinition[] {
        // fall back to number type to silence
        return this.arguments.map( a => a.typeDefinition!);
    }

    link(scope: Scope, hint: TypeDefinition | null): void {
        this.arguments.forEach(a => a.link(scope, null));
        const e = this.expression!.instantiate();
        e.link(this, hint);
        this.returnType = e.typeDefinition!;
    }

    sink(parameters: Observable<any>[]): Observable<any> {
        if (parameters.length !== this.arguments.length) {
            throw new Error(`${this.line}:${this.column}: wrong parameter count: ${this.arguments.length} expected, but got ${parameters.length}`);
        }

        const e = this.expression!.instantiate();
        this.arguments.forEach((a, index) => a.sink = parameters[index]);
        e.link(this, this.returnType);
        return e.sink;
    }


    viewForKey(key: string): View | null {
        return this.layout.viewForKey(key);
    }
}

export class Functions {
    private readonly functions: FunctionDeclaration[] = [];

    constructor(readonly line: number, readonly column: number) {

    }

    registerFunction(func: FunctionDeclaration) {
        this.functions.push(func);
    }

    functionFor(name: string, parameters: TypeDefinition[]): FunctionImplementationI|null {
        for (let f of this.functions) {
            if (f.name === name && isEqual(f.parameterTypes, parameters)) {
                return f;
            }
        }

        return null;
    }

    functionsLoose(name: string, parametersCount: number): FunctionImplementationI[] {
        return this.functions.filter(f => f.name === name && f.parameterTypes.length === parametersCount);
    }

    link(scope: Scope) {
        this.functions.forEach(f => f.link(scope, null));
    }
}
