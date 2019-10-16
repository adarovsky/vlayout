import {AbsoluteLayout, LinearLayoutAxis, View} from "./view";
import {Layout, Scope} from "./layout";
import {LexIdentifier} from "./lexer";
import {Expression, Variable} from "./expression";
import {ListDefinition, TypeDefinition} from "./types";
import {Engine} from "./engine";
import {FunctionImplementationI} from "./builtin_functions";

export class ListItemPrototype extends AbsoluteLayout implements Scope {
    name: string;

    constructor(name: LexIdentifier, readonly layout: Layout) {
        super();
        this.name = name.content;
        this.line = name.line;
        this.column = name.column;
    }

    link(scope: Scope): void {
        super.link(this);
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
        return null;
    }
}

export class List extends View {
    model: Variable|null = null;
    prototypes: ListItemPrototype[] = [];

    constructor(readonly axis: LinearLayoutAxis) {
        super();
    }

    link(scope: Scope): void {
        super.link(scope);
        if (this.model) {
            this.model.link(scope, null);
            if (!(this.model.typeDefinition instanceof ListDefinition)) {
                throw new Error(`${this.line}:${this.column}: model type is not a model list`);
            }
        }
        this.prototypes.forEach(p => p.link(scope));
    }
}