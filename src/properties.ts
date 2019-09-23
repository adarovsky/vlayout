import {Expression} from "./expression";
import {Dictionary} from "./types";

export class PropertyDeclaration {
    readonly name: string;
    readonly line: number;
    readonly column: number;

    constructor(name: string, line: number, column: number) {
        this.name = name;
        this.line = line;
        this.column = column;
    }

    toString(padding: number = 0): string {
        return '';
    }
}

export class CompoundPropertyDeclaration extends PropertyDeclaration {
    private properties: Dictionary<PropertyDeclaration> = {};

    registerProperty(p: PropertyDeclaration) {
        this.properties[p.name] = p;
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
    readonly expression: Expression;

    constructor(name: string, expression: Expression, line: number, column: number) {
        super(name, line, column);
        this.expression = expression;
    }

    toString(padding: number = 0): string {
        return `${' '.repeat(padding)}${this.name}: ${this.expression}`;
    }
}