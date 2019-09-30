import {Observable, of, combineLatest, EMPTY } from "rxjs";
import { map, distinctUntilChanged, switchMap } from 'rxjs/operators';
import {ColorContainer, EnumDefinition, Set, TypeDefinition} from "./types";
import {LexColor, LexNumber, LexString, LexToken} from "./lexer";
import {Layout} from "./layout";
import {LinkError} from "./errors";

export class Expression {
    readonly line: number;
    readonly column: number;
    sink: Observable<any> = EMPTY;
    typeDefinition: TypeDefinition | null;

    constructor(line: number, column: number) {
        this.line = line;
        this.column = column;
        this.typeDefinition = null;
    }

    link(layout: Layout, hint: TypeDefinition | null): void {

    }

    toString(): string {
        return '';
    }
}

export class Constant extends Expression {
    readonly lex: LexToken;
    constructor(lex: LexToken) {
        super(lex.line, lex.column);
        this.lex = lex;
    }

    toString(): string {
        if (this.lex instanceof LexString) {
            return '"' + this.lex.content + '"';
        }
        return this.lex.content;
    }

    link(layout: Layout, hint: TypeDefinition | null): void {
        if (this.lex instanceof LexNumber) {
            this.typeDefinition = layout.engine.numberType();
            this.sink = of(+this.lex.content);
        }
        else if (this.lex instanceof LexString) {
            this.typeDefinition = layout.engine.stringType();
            this.sink = of(this.lex.content);
        }
        else if (this.lex instanceof LexColor) {
            this.typeDefinition = layout.engine.colorType();
            const color = this.lex.content;
            const red = parseInt(color.slice(0, 2), 16);
            const green = parseInt(color.slice(2, 4), 16);
            const blue = parseInt(color.slice(4, 6), 16);
            this.sink = of(new ColorContainer(red, green, blue));
        }
        else if (this.lex.content === 'true') {
            this.typeDefinition = layout.engine.boolType();
            this.sink = of(true);
        }
        else if (this.lex.content === 'false') {
            this.typeDefinition = layout.engine.boolType();
            this.sink = of(false);
        }

        if (hint && hint !== this.typeDefinition) {
            throw new LinkError(this.line, this.column, `cannot cast ${hint} to ${this.typeDefinition}`);
        }
    }
}

export class Nil extends Constant {

    link(layout: Layout, hint: TypeDefinition | null): void {
        if  (hint === layout.engine.numberType() ||
            // hint === layout.engine.stringType() ||
            hint === layout.engine.imageType()) {
            this.typeDefinition = hint;
            this.sink = of(null);
        }

        if (!hint) {
            this.typeDefinition = layout.engine.numberType();
            this.sink = of(null);
        }

        if (hint !==this.typeDefinition) {
            throw new LinkError(this.line, this.column, `cannot cast nil to ${hint}`);
        }
    }
}

export class EnumValue extends Expression {
    readonly key: string;
    constructor(key: string, line: number, column: number) {
        super(line, column);
        this.key = key;
    }

    link(layout: Layout, hint: TypeDefinition | null): void {
        this.linkEnum(hint);
    }

    linkEnum(hint: TypeDefinition | null): void {
        if (this.typeDefinition) return;

        if (!hint || !(hint instanceof EnumDefinition)) {
            throw new LinkError(this.line, this.column, `cannot get enum type from context for ${this}`);
        }

        this.typeDefinition = hint;
        const v = (hint as EnumDefinition).valueFor(this.key);
        if (v === undefined) {
            throw new LinkError(this.line, this.column, `enum ${this.typeDefinition} does not have value ${this}`);
        }
        this.sink = of(v);
    }

    toString(): string {
        return `.${this.key}`;
    }
}

export class Variable extends Expression {
    keyPath: string;
    constructor(keyPath: string, line: number, column: number) {
        super(line, column);
        this.keyPath = keyPath;
    }


    link(layout: Layout, hint: TypeDefinition | null): void {
        const prop = layout.variableForKeyPath(this.keyPath);

        if (prop) {
            prop.link(layout, hint);
            this.typeDefinition = prop.typeDefinition;
            this.sink = prop.sink;
        }
        else {
            throw new LinkError(this.line, this.column, `property ${this} cannot be found`);
        }
    }

    toString(): string {
        return this.keyPath;
    }
}

export class NegateOp extends Expression {
    readonly op: LexToken;
    readonly expression: Expression;
    constructor(op: LexToken, expression: Expression, line: number, column: number) {
        super(line, column);
        this.op = op;
        this.expression = expression;
    }


    link(layout: Layout, hint: TypeDefinition | null): void {
        switch (this.op.content) {
            case '-':
                this.typeDefinition = layout.engine.numberType();
                this.expression.link(layout, this.typeDefinition);
                this.sink = this.expression.sink.pipe(map(x => - (+x)));
                break;

            case '!':
                this.typeDefinition = layout.engine.boolType();
                this.expression.link(layout, this.typeDefinition);
                this.sink = this.expression.sink.pipe(map(x => ! x));
                break;
            default:
                throw new LinkError(this.line, this.column, `unknown negate operation ${this.op.content}`);
        }

        if (hint && hint !== this.typeDefinition) {
            throw new LinkError(this.line, this.column, `${hint} cannot be applied. Only ${this.typeDefinition} is supported`);
        }
    }

    toString(): string {
        return `${this.op.content} ${this.expression}`;
    }
}

export class FunctionCall extends Expression {
    readonly name: string;
    readonly parameters: Array<Expression>;
    constructor(line: number, column: number, name: string, parameters: Array<Expression>) {
        super(line, column);
        this.name = name;
        this.parameters = parameters;
    }


    link(layout: Layout, hint: TypeDefinition | null): void {
        try {
            for (let p of this.parameters) {
                p.link(layout, null);
            }
            const impl = layout.engine.functionFor(this.name, this.parameters.map(p => p.typeDefinition!));
            this.typeDefinition = impl.returnType;
            this.sink = impl.sink(this.parameters.map(p => p.sink));
        }
        catch (e) {
            for (let f of layout.engine.functionsLoose(this.name, this.parameters.length)) {
                try {
                    for (let i = 0; i < this.parameters.length; ++i) {
                        const p = this.parameters[i];
                        p.typeDefinition = null;
                        p.sink = EMPTY;
                        p.link(layout, f.parameterTypes[i]);

                        this.typeDefinition = f.returnType;
                        this.sink = f.sink(this.parameters.map(p => p.sink));
                    }
                    return;
                }
                catch (e) {
                    // try to link functions one by one
                }
            }

            throw new LinkError(this.line, this.column, `cannot find function for ${this}`);
        }
    }

    toString(): string {
        return `${this.name}(${this.parameters.map(p => p.toString()).join(', ')})`;
    }
}

export class BinaryExpression extends Expression {
    readonly left: Expression;
    readonly right: Expression;

    constructor(left: Expression, right: Expression) {
        super(left.line, left.column);
        this.left = left;
        this.right = right;
    }


    link(layout: Layout, hint: TypeDefinition | null): void {
        if (!this.left.typeDefinition && this.right.typeDefinition) {
            this.left.link(layout, this.right.typeDefinition);
        }
        else if (this.left.typeDefinition && !this.right.typeDefinition) {
            this.right.link(layout, this.left.typeDefinition);
        }
        else {
            this.left.link(layout, null);
            this.right.link(layout, this.left.typeDefinition);
            if (!this.right.typeDefinition) {
                throw new LinkError(this.line, this.column, `type definitions for ${this.left} and ${this.right} could not be deduced`);
            }
            if (!this.left.typeDefinition) {
                this.left.link(layout, this.right.typeDefinition);

                if (!this.left.typeDefinition) {
                    throw new LinkError(this.line, this.column, `type definitions for ${this.left} and ${this.right} could not be deduced`);
                }
            }
        }
    }
}

export class Addition extends BinaryExpression {

    link(layout: Layout, hint: TypeDefinition | null): void {
        super.link(layout, hint);
        this.typeDefinition = this.left.typeDefinition;

        if (this.typeDefinition === layout.engine.numberType()) {
            const left = this.left.sink as Observable<number>;
            const right = this.right.sink as Observable<number>;
            this.sink = combineLatest([left, right]).pipe(
                map (([a, b]) => a + b),
                distinctUntilChanged());
        }
        else if (this.typeDefinition === layout.engine.stringType()) {
            const left = this.left.sink as Observable<string>;
            const right = this.right.sink as Observable<string>;
            this.sink = combineLatest([left, right]).pipe(
                map (([a, b]) => a + b),
                distinctUntilChanged())
        }
        else {
            throw new LinkError(this.line, this.column, `invalid type ${this.typeDefinition} for ${this}. Only numbers and strings are supported`);
        }
    }


    toString(): string {
        return `${this.left} + ${this.right}`;
    }
}

export class Subtraction extends BinaryExpression {
    link(layout: Layout, hint: TypeDefinition | null): void {
        super.link(layout, hint);
        this.typeDefinition = this.left.typeDefinition;

        if (this.typeDefinition === layout.engine.numberType()) {
            const left = this.left.sink as Observable<number>;
            const right = this.right.sink as Observable<number>;
            this.sink = combineLatest([left, right]).pipe(
                map (([a, b]) => a - b),
                distinctUntilChanged())
        }
        else {
            throw new LinkError(this.line, this.column, `invalid type ${this.typeDefinition} for ${this}. Only numbers are supported`);
        }
    }
    toString(): string {
        return `${this.left} - ${this.right}`;
    }
}

export class Multiply extends BinaryExpression {
    link(layout: Layout, hint: TypeDefinition | null): void {
        super.link(layout, hint);
        this.typeDefinition = this.left.typeDefinition;

        if (this.typeDefinition === layout.engine.numberType()) {
            const left = this.left.sink as Observable<number>;
            const right = this.right.sink as Observable<number>;
            this.sink = combineLatest([left, right]).pipe(
                map (([a, b]) => a * b),
                distinctUntilChanged())
        }
        else {
            throw new LinkError(this.line, this.column, `invalid type ${this.typeDefinition} for ${this}. Only numbers are supported`);
        }
    }

    toString(): string {
        return `${this.left} * ${this.right}`;
    }
}

export class Divide extends BinaryExpression {
    link(layout: Layout, hint: TypeDefinition | null): void {
        super.link(layout, hint);
        this.typeDefinition = this.left.typeDefinition;

        if (this.typeDefinition === layout.engine.numberType()) {
            const left = this.left.sink as Observable<number>;
            const right = this.right.sink as Observable<number>;
            this.sink = combineLatest([left, right]).pipe(
                map (([a, b]) => a / b),
                distinctUntilChanged())
        }
        else {
            throw new LinkError(this.line, this.column, `invalid type ${this.typeDefinition} for ${this}. Only numbers are supported`);
        }
    }

    toString(): string {
        return `${this.left} / ${this.right}`;
    }
}

export class ModDivide extends BinaryExpression {
    link(layout: Layout, hint: TypeDefinition | null): void {
        super.link(layout, hint);
        this.typeDefinition = this.left.typeDefinition;
        if (hint && hint !== this.typeDefinition) {
            throw new LinkError(this.line, this.column, `cannot cast ${hint} to ${this.typeDefinition} while linking ${this}`);
        }

        if (this.typeDefinition === layout.engine.numberType()) {
            const left = this.left.sink as Observable<number>;
            const right = this.right.sink as Observable<number>;
            this.sink = combineLatest([left, right]).pipe(
                map (([a, b]) => a % b),
                distinctUntilChanged())
        }
        else {
            throw new LinkError(this.line, this.column, `invalid type ${this.typeDefinition} for ${this}. Only numbers are supported`);
        }
    }

    toString(): string {
        return `${this.left} % ${this.right}`;
    }
}

export class More extends BinaryExpression {
    link(layout: Layout, hint: TypeDefinition | null): void {
        super.link(layout, hint);
        this.typeDefinition = layout.engine.boolType();
        if (hint && hint !== this.typeDefinition) {
            throw new LinkError(this.line, this.column, `cannot cast ${hint} to ${this.typeDefinition} while linking ${this}`);
        }

        if (this.left.typeDefinition === layout.engine.numberType()) {
            const left = this.left.sink as Observable<number>;
            const right = this.right.sink as Observable<number>;
            this.sink = combineLatest([left, right]).pipe(
                map (([a, b]) => a > b),
                distinctUntilChanged())
        }
        else {
            throw new LinkError(this.line, this.column, `invalid type ${this.left.typeDefinition} for ${this}. Only numbers are supported`);
        }
    }

    toString(): string {
        return `${this.left} > ${this.right}`;
    }
}

export class Less extends BinaryExpression {
    link(layout: Layout, hint: TypeDefinition | null): void {
        super.link(layout, hint);
        this.typeDefinition = layout.engine.boolType();
        if (hint && hint !== this.typeDefinition) {
            throw new LinkError(this.line, this.column, `cannot cast ${hint} to ${this.typeDefinition} while linking ${this}`);
        }

        if (this.left.typeDefinition === layout.engine.numberType()) {
            const left = this.left.sink as Observable<number>;
            const right = this.right.sink as Observable<number>;
            this.sink = combineLatest([left, right]).pipe(
                map (([a, b]) => a < b),
                distinctUntilChanged())
        }
        else {
            throw new LinkError(this.line, this.column, `invalid type ${this.left.typeDefinition} for ${this}. Only numbers are supported`);
        }
    }

    toString(): string {
        return `${this.left} < ${this.right}`;
    }
}

export class MoreEqual extends BinaryExpression {
    link(layout: Layout, hint: TypeDefinition | null): void {
        super.link(layout, hint);
        this.typeDefinition = layout.engine.boolType();
        if (hint && hint !== this.typeDefinition) {
            throw new LinkError(this.line, this.column, `cannot cast ${hint} to ${this.typeDefinition} while linking ${this}`);
        }

        if (this.left.typeDefinition === layout.engine.numberType()) {
            const left = this.left.sink as Observable<number>;
            const right = this.right.sink as Observable<number>;
            this.sink = combineLatest([left, right]).pipe(
                map (([a, b]) => a >= b),
                distinctUntilChanged())
        }
        else {
            throw new LinkError(this.line, this.column, `invalid type ${this.left.typeDefinition} for ${this}. Only numbers are supported`);
        }
    }

    toString(): string {
        return `${this.left} >= ${this.right}`;
    }
}

export class LessEqual extends BinaryExpression {
    link(layout: Layout, hint: TypeDefinition | null): void {
        super.link(layout, hint);
        this.typeDefinition = layout.engine.boolType();
        if (hint && hint !== this.typeDefinition) {
            throw new LinkError(this.line, this.column, `cannot cast ${hint} to ${this.typeDefinition} while linking ${this}`);
        }

        if (this.left.typeDefinition === layout.engine.numberType()) {
            const left = this.left.sink as Observable<number>;
            const right = this.right.sink as Observable<number>;
            this.sink = combineLatest([left, right]).pipe(
                map (([a, b]) => a <= b),
                distinctUntilChanged())
        }
        else {
            throw new LinkError(this.line, this.column, `invalid type ${this.left.typeDefinition} for ${this}. Only numbers are supported`);
        }
    }

    toString(): string {
        return `${this.left} <= ${this.right}`;
    }
}

export class NotEqual extends BinaryExpression {
    link(layout: Layout, hint: TypeDefinition | null): void {
        super.link(layout, hint);
        this.typeDefinition = layout.engine.boolType();
        if (hint && hint !== this.typeDefinition) {
            throw new LinkError(this.line, this.column, `cannot cast ${hint} to ${this.typeDefinition} while linking ${this}`);
        }

        if (this.left instanceof TrueMatcher || this.right instanceof TrueMatcher) {
            this.sink = of(false);
        }
        else if (this.left.typeDefinition === this.right.typeDefinition) {
            const left = this.left.sink;
            const right = this.right.sink;
            this.sink = combineLatest([left, right]).pipe(
                map (([a, b]) => a !== b),
                distinctUntilChanged())
        }
        else if (this.left.typeDefinition instanceof Set) {
            if (this.right.typeDefinition !== this.left.typeDefinition.original) {
                throw new LinkError(this.line, this.column, `cannot cast ${this.right.typeDefinition} to ${this.left.typeDefinition.original} while linking ${this}`);
            }
            const left = this.left.sink as Observable<Array<any>>;
            const right = this.right.sink;
            this.sink = combineLatest([left, right]).pipe(
                map (([a, b]) => a.indexOf(b) === -1),
                distinctUntilChanged())
        }
        else if (this.right.typeDefinition instanceof Set) {
            if (this.left.typeDefinition !== this.right.typeDefinition.original) {
                throw new LinkError(this.line, this.column, `cannot cast ${this.left.typeDefinition} to ${this.right.typeDefinition.original} while linking ${this}`);
            }
            const left = this.left.sink;
            const right = this.right.sink as Observable<Array<any>>;
            this.sink = combineLatest([left, right]).pipe(
                map (([a, b]) => b.indexOf(a) === -1),
                distinctUntilChanged())
        }
        else {
            throw new LinkError(this.line, this.column, `invalid types for comparison: ${this.left.typeDefinition} and ${this.right.typeDefinition}`);
        }
    }


    toString(): string {
        return `${this.left} !==${this.right}`;
    }
}

export class EqualExp extends BinaryExpression {
    link(layout: Layout, hint: TypeDefinition | null): void {
        super.link(layout, hint);
        this.typeDefinition = layout.engine.boolType();
        if (hint && hint !== this.typeDefinition) {
            throw new LinkError(this.line, this.column, `cannot cast ${hint} to ${this.typeDefinition} while linking ${this}`);
        }

        if (this.left instanceof TrueMatcher || this.right instanceof TrueMatcher) {
            this.sink = of(true);
        }
        else if (this.left.typeDefinition === this.right.typeDefinition) {
            const left = this.left.sink;
            const right = this.right.sink;
            this.sink = combineLatest([left, right]).pipe(
                map (([a, b]) => a === b),
                distinctUntilChanged())
        }
        else if (this.left.typeDefinition instanceof Set) {
            if (this.right.typeDefinition !== this.left.typeDefinition.original) {
                throw new LinkError(this.line, this.column, `cannot cast ${this.right.typeDefinition} to ${this.left.typeDefinition.original} while linking ${this}`);
            }
            const left = this.left.sink as Observable<Array<any>>;
            const right = this.right.sink;
            this.sink = combineLatest([left, right]).pipe(
                map (([a, b]) => a.indexOf(b) !== -1),
                distinctUntilChanged())
        }
        else if (this.right.typeDefinition instanceof Set) {
            if (this.left.typeDefinition !== this.right.typeDefinition.original) {
                throw new LinkError(this.line, this.column, `cannot cast ${this.left.typeDefinition} to ${this.right.typeDefinition.original} while linking ${this}`);
            }
            const left = this.left.sink;
            const right = this.right.sink as Observable<Array<any>>;
            this.sink = combineLatest([left, right]).pipe(
                map (([a, b]) => b.indexOf(a) !== -1),
                distinctUntilChanged())
        }
        else {
            throw new LinkError(this.line, this.column, `invalid types for comparison: ${this.left.typeDefinition} and ${this.right.typeDefinition}`);
        }
    }

    toString(): string {
        return `${this.left} === ${this.right}`;
    }
}

export class OrExp extends BinaryExpression {
    link(layout: Layout, hint: TypeDefinition | null): void {
        this.typeDefinition = layout.engine.boolType();
        if (hint && hint !== this.typeDefinition) {
            throw new LinkError(this.line, this.column, `cannot cast ${hint} to ${this.typeDefinition} while linking ${this}`);
        }

        this.left.link(layout, layout.engine.boolType());
        if (this.left.typeDefinition !== layout.engine.boolType()) {
            throw new LinkError(this.line, this.column, `cannot cast ${this.left.typeDefinition} to ${this.typeDefinition} while linking ${this.left}`);
        }
        this.right.link(layout, layout.engine.boolType());
        if (this.left.typeDefinition !== layout.engine.boolType()) {
            throw new LinkError(this.line, this.column, `cannot cast ${this.right.typeDefinition} to ${this.typeDefinition} while linking ${this.right}`);
        }


        const left = this.left.sink as Observable<boolean>;
        const right = this.right.sink as Observable<boolean>;
        this.sink = combineLatest([left, right]).pipe(
            map (([a, b]) => a || b),
            distinctUntilChanged())

    }

    toString(): string {
        return `${this.left} || ${this.right}`;
    }
}

export class AndExp extends BinaryExpression {
    link(layout: Layout, hint: TypeDefinition | null): void {
        this.typeDefinition = layout.engine.boolType();
        if (hint && hint !== this.typeDefinition) {
            throw new LinkError(this.line, this.column, `cannot cast ${hint} to ${this.typeDefinition} while linking ${this}`);
        }

        this.left.link(layout, layout.engine.boolType());
        if (this.left.typeDefinition !== layout.engine.boolType()) {
            throw new LinkError(this.line, this.column, `cannot cast ${this.left.typeDefinition} to ${this.typeDefinition} while linking ${this.left}`);
        }
        this.right.link(layout, layout.engine.boolType());
        if (this.left.typeDefinition !== layout.engine.boolType()) {
            throw new LinkError(this.line, this.column, `cannot cast ${this.right.typeDefinition} to ${this.typeDefinition} while linking ${this.right}`);
        }

        const left = this.left.sink as Observable<boolean>;
        const right = this.right.sink as Observable<boolean>;
        this.sink = combineLatest([left, right]).pipe(
            map (([a, b]) => a && b),
            distinctUntilChanged())

    }

    toString(): string {
        return `${this.left} && ${this.right}`;
    }
}

export class Alternative extends Expression {
    alternatives: Array<Expression>;
    constructor(alternatives: Array<Expression>) {
        super(alternatives[0].line, alternatives[0].column);
        this.alternatives = alternatives;
    }


    link(layout: Layout, hint: TypeDefinition | null): void {
        let typeDef = hint;
        for (let a of this.alternatives) {
            a.link(layout, typeDef);
            if (!typeDef && a.typeDefinition) {
                typeDef = a.typeDefinition;
            } else if (typeDef !==null && a.typeDefinition !==null && typeDef !== a.typeDefinition) {
                throw new LinkError(this.line, this.column, `cannot cast ${a.typeDefinition} to ${typeDef} while linking ${this}`);
            }
        }

        if (!typeDef) {
            throw new LinkError(this.line, this.column, `cannot find type while linking ${this}`);
        }

        for (let a of this.alternatives) {
            if (!a.typeDefinition)
                a.link(layout, typeDef);
        }

        this.typeDefinition = layout.engine.type(typeDef.typeName + '*');
        const sinks = this.alternatives.map(x => x.sink);
        this.sink = combineLatest(sinks);
    }

    toString(): string {
        return this.alternatives.map(x => x.toString()).join("|");
    }
}

export class Conditional extends Expression {
    readonly condition: Expression;
    readonly ifTrue: Expression;
    readonly ifFalse: Expression;

    constructor(condition: Expression, ifTrue: Expression, ifFalse: Expression) {
        super(condition.line, condition.column);
        this.condition = condition;
        this.ifTrue = ifTrue;
        this.ifFalse = ifFalse;
    }


    link(layout: Layout, hint: TypeDefinition | null): void {
        this.condition.link(layout, layout.engine.boolType());
        this.ifTrue.link(layout, hint);
        if (this.ifTrue.typeDefinition) {
            this.ifFalse.link(layout, this.ifTrue.typeDefinition);
        }
        else {
            this.ifFalse.link(layout, hint);
            if (!this.ifFalse.typeDefinition) {
                throw new LinkError(this.ifFalse.line, this.ifFalse.column, `cannot deduce type for ${this.ifTrue} and ${this.ifFalse}`);
            }
            this.ifTrue.link(layout, this.ifFalse.typeDefinition);
        }

        if (this.ifTrue.typeDefinition !== this.ifFalse.typeDefinition) {
            throw new LinkError(this.ifTrue.line, this.ifTrue.column, `types for ${this.ifTrue} (${this.ifTrue.typeDefinition}) and ${this.ifFalse} (${this.ifFalse.typeDefinition}) don't match`);
        }
        this.typeDefinition = this.ifTrue.typeDefinition;
        this.sink = (this.condition.sink as Observable<boolean>).pipe(
            switchMap(c => c ? this.ifTrue.sink : this.ifFalse.sink))
    }

    toString(): string {
        return `${this.condition} ? ${this.ifTrue} : ${this.ifFalse}`;
    }
}

export class SwitchMatcher extends Expression {
    readonly matchers: Array<Expression>;
    readonly result: Expression;
    constructor(line: number, column: number, matchers: Array<Expression>, result: Expression) {
        super(line, column);
        this.matchers = matchers;
        this.result = result;
    }


    link(layout: Layout, hint: TypeDefinition | null): void {
        this.typeDefinition = this.result.typeDefinition;
        this.sink = combineLatest(this.matchers.map(m => m.sink as Observable<boolean>)).pipe(
            map(arr => arr.reduce((previousValue, currentValue) => previousValue && currentValue)),
            distinctUntilChanged(),
            map(x => x ? this.result : null)
        );
    }

    toString(): string {
        return super.toString();
    }
}

export class TrueMatcher extends Expression {

    link(layout: Layout, hint: TypeDefinition | null): void {
        if (hint) this.typeDefinition = hint;
    }
}

export class SwitchCompare extends EqualExp {
    link(layout: Layout, hint: TypeDefinition | null): void {
        this.left.link(layout, hint);
        this.right.link(layout, hint);
        super.link(layout, null);
    }
}

export class Switch extends Expression {
    readonly sources: Array<Expression>;
    readonly matchers: Array<SwitchMatcher>;
    constructor(line: number, column: number, sources: Array<Expression>, matchers: Array<SwitchMatcher>) {
        super(line, column);
        this.sources = sources;
        this.matchers = matchers;
    }


    link(layout: Layout, hint: TypeDefinition | null): void {
        for (let s of this.sources) {
            s.link(layout, null);
            if (!s.typeDefinition) {
                throw new LinkError(s.line, s.column, `type for ${s} cannot be found`);
            }
        }

        let resultType = hint;
        for (let line of this.matchers) {
            line.matchers.forEach((m, index) => {
                const src = this.sources[index];
                m.link(layout, src.typeDefinition);
            });
            line.result.link(layout, resultType);
            if (line.result.typeDefinition) {
                if (!resultType) {
                    resultType = line.result.typeDefinition;
                }
                else if (resultType !== line.result.typeDefinition) {
                    throw new LinkError(line.result.line, line.result.column, `type for ${line.result} (${line.result.typeDefinition}) does not match switch result ${resultType}`);
                }
            }
        }

        if (!resultType) {
            throw new LinkError(this.line, this.column, `result type cannot be found`);
        }

        for (let line of this.matchers) {
            if (!line.result.typeDefinition) {
                line.result.link(layout, resultType);
            }
            line.link(layout, null);
        }

        this.typeDefinition = resultType;

        this.sink = combineLatest(this.matchers.map(m => m.sink as Observable<Expression|null>)).pipe(
            switchMap( arr => {
                for (let a of arr) {
                    if (a) return a.sink;
                }
                return EMPTY;
            }),
            distinctUntilChanged()
        );
    }

    toString(): string {
        return `switch(${this.sources.map(s => s.toString()).join(',')} {
        ${this.matchers.map(m => `case (${m.matchers.map(mm => mm.toString()).join(', ')}) => ${m.result}`).join('\n')}
        }`
    }
}
