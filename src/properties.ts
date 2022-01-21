import {Expression} from "./expression";
import {Dictionary, TypeDefinition} from "./types";
import {Scope} from "./layout";
import {tap} from "rxjs/operators";

export class PropertyDeclaration extends Expression {
    parent: PropertyDeclaration|null = null;
    constructor(readonly name: string, line: number, column: number) {
        super(line, column);
    }

    get fullName(): string {
        if (this.parent && this.parent.name.length > 0) {
            return this.parent.fullName + '.' + this.name;
        }
        else {
            return this.name;
        }
    }

    toString(padding: number = 0): string {
        return '';
    }
}

export class CompoundPropertyDeclaration extends PropertyDeclaration {
    private properties: Dictionary<PropertyDeclaration> = {};

    registerProperty(p: PropertyDeclaration) {
        this.properties[p.name] = p;
        p.parent = this;
    }

    propertyWithName(name: string) : PropertyDeclaration|null {
        return this.properties[name];
    }

    toString(padding: number = 0): string {
        let r = `${' '.repeat(padding)}${this.name}: {\n`;
        for (let k in this.properties) {
            if (this.properties.hasOwnProperty(k)) {
                r += `${this.properties[k].toString(padding+4)}\n`;
            }
        }
        r += `${' '.repeat(padding)}}\n`;
        return r;
    }
}

export class ExpressionPropertyDeclaration extends PropertyDeclaration {
    constructor(name: string, readonly expression: Expression, line: number, column: number) {
        super(name, line, column);
    }

    toString(padding: number = 0): string {
        return `${' '.repeat(padding)}${this.name}: ${this.expression}`;
    }

    link(scope: Scope, hint: TypeDefinition | null): void {
        this.expression.link(scope, hint);
        this.sink = this.expression.sink.pipe(
            tap(v => scope.engine.logPropertyValue(this.fullName, v))
        );
        this.typeDefinition = this.expression.typeDefinition;
    }
}
