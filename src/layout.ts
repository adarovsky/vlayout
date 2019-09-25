import {Engine} from "./engine";
import {Bindings} from "./bindings";
import {LexColor, Lexer, LexIdentifier, LexNumber, LexString, LexToken} from "./lexer";
import {CompoundPropertyDeclaration, ExpressionPropertyDeclaration, PropertyDeclaration} from "./properties";
import {
    Addition,
    Alternative,
    AndExp,
    Conditional,
    Constant,
    Divide,
    EnumValue,
    EqualExp,
    Expression,
    FunctionCall,
    Less,
    LessEqual,
    ModDivide,
    More,
    MoreEqual,
    Multiply,
    NegateOp,
    Nil,
    NotEqual,
    OrExp,
    Subtraction,
    Switch,
    SwitchCompare,
    SwitchMatcher,
    TrueMatcher,
    Variable
} from "./expression";
import {AbsoluteLayout, Container, Layer, LayoutView, LinearLayout, LinearLayoutAxis, StackLayout, View} from "./view";
import {Gradient, ImageView, Label, Progress, RoundRect} from "./primitives";
import {LinkError} from "./errors";
import React, {Component} from "react";
import './vlayout.css';

export class ParseError extends Error {
    constructor(line: number, column: number, message: string) {
        super(`${line}:${column}: ${message}`)
    }
}

export interface LayoutProps {
    engine: Engine;
    content: string;
}

interface LayoutState {
    layout: LayoutView|null;
}

export class Layout extends Component<LayoutProps, LayoutState> {
    readonly bindings: Bindings;
    properties: CompoundPropertyDeclaration|null = null;


    private _lexer: Lexer;
    private _lastMatched: LexToken|null = null;
    state: LayoutState;

    constructor(props: LayoutProps) {
        super(props);
        this._lexer = new Lexer(props.content);
        this.bindings = new Bindings(this.props.engine);
        this.state = {
            layout: this.build()
        };
    }

    get engine(): Engine {
        return this.props.engine;
    }

    build(): LayoutView|null {
        this._lexer.next();
        this.parseBindings();
        this.parseTypes();
        this.parseInputs();
        this.parseProperties();
        const l = this.parseLayout();

        if (l) {
            l.link(this);
        }

        return l;
    }

    private parseBindings(): void {
        if (this.match("bindings")) {
            if (this.match("{")) {
                while (this.parseBindingPair()) {}
                this.matchOrFail("}")
            }
            else {
                this.raiseError("} expected");
            }
        }
    }

    private parseBindingPair() : boolean {
        let name: LexIdentifier|null;
        let value: LexIdentifier|null;
        if ((name = this.matchIdentifier())) {
            this.matchOrFail(":");
            if ((value = this.matchIdentifier())) {
                this.bindings.registerSlot(name.content, value.content);
            }
            else {
                this.raiseError("binding type expected");
            }
            return true;
        }

        return false;
    }


    private parseTypes(): void {
        if (this.match("types")) {
            this.matchOrFail("{");
            while (this.parseTypePair()) {}
            this.matchOrFail("}");
        }
    }

    private parseTypePair() : boolean {
        if (this.matchIdentifier()) {
            this.matchOrFail(":");
            if (!this.parseEnum()) {
                this.raiseError("enum declaration expected");
            }
            return true;
        }

        return false;
    }

    private parseEnum(): Array<string>|null {

        if (this.match("enum")) {
            let r = new Array<string>();

            this.matchOrFail('(');

            do {
                let v = this.matchIdentifier();
                if (!v) {
                    this.raiseError("enum value expected");
                }

                r.push(v!.content);
            } while (this.match(','));

            this.matchOrFail(')');

            return r;
        }

        return null;
    }

    private parseInputs(): void {
        if (this.match('inputs')) {
            this.matchOrFail('{');
            while (this.parseInput('')) {}
            this.matchOrFail('}');
        }
    }

    private parseInput(keyPath: string): boolean {
        const name = this.matchIdentifier();

        if (name) {
            const kp = keyPath.length > 0 ? (keyPath + "." + name.content) : name.content;

            if (this.match('{')) {
                while (this.parseInput(kp)) {}
                this.matchOrFail('}')
            }
            else {
                this.matchOrFail(':');
                const typeName = this.matchIdentifier();
                if (!typeName) this.raiseError("type name expected");

                this.props.engine.inputs.registerInputReference(kp, typeName!.content, name.line, name.column)
            }

            return true;
        }

        return false;
    }

    private parseProperties(): void {
        if (this.match('properties')) {
            this.properties = new CompoundPropertyDeclaration("properties", this._lastMatched!.line, this._lastMatched!.column);
            this.matchOrFail('{');
            let p: PropertyDeclaration|null;
            while ((p = this.parseProperty())) {
                this.properties.registerProperty(p);
            }
            this.matchOrFail('}');
        }
    }

    private parseProperty(): PropertyDeclaration|null {
        const name = this.matchIdentifier();
        if (name) {
            if (this.match('{')) {
                let compound = new CompoundPropertyDeclaration(name.content, name.line, name.column);
                let p: PropertyDeclaration|null;
                while ((p = this.parseProperty())) {
                    compound.registerProperty(p);
                }
                this.matchOrFail('}');
                return compound;
            }
            else {
                this.matchOrFail(':');
                let e = this.parseExpression();
                if (!e) this.raiseError("expression expected");
                return new ExpressionPropertyDeclaration(name.content, e!, name.line, name.column);
            }
        }
        else {
            return null;
        }
    }

    private parseExpression(): Expression|null {
        return this.parseConditional();
    }

    private parseConditional(): Expression|null {
        const cond = this.parseLogicalOr();
        if (cond && this.match('?')) {
            const left = this.parseExpression();
            if (!left) this.raiseError(`expression expected after ${cond}`);
            this.matchOrFail(':');
            const right = this.parseExpression();
            if (!right) this.raiseError(`expression expected after ${cond} ? ${left}`);

            return new Conditional(cond, left!, right!);
        }
        return cond;
    }

    private parseLogicalOr(): Expression|null {
        let node = this.parseLogicalAnd();
        if (!node) return null;

        while (this.match("||")) {
            const nextOr = this.parseLogicalAnd();
            if (!nextOr)
                this.raiseError(`Expression expected after ${node}`);
            node = new OrExp(node!, nextOr!);
        }
        return node;
    }

    private parseLogicalAnd(): Expression|null {
        let node = this.parseEqual();
        if (!node) return null;

        while (this.match("&&")) {
            const nextAnd = this.parseEqual();
            if (!nextAnd)
                this.raiseError(`Expression expected after ${node}`);
            node = new AndExp(node!, nextAnd!);
        }
        return node;
    }

    private parseEqual(): Expression|null {
        let left = this.parseCompare();

        if (!left)
            return null;

        const token = this.match("==") || this.match("!=");
        if (token) {
            const right = this.parseCompare();
            if (!right)
                this.raiseError(`Expression expected after ${left} ${token.content}`);
            return token.content === "==" ? new EqualExp(left!, right!) : new NotEqual(left!, right!);
        }

        return left;
    }

    private parseCompare(): Expression|null {
        const left = this.parseAddSub();
        if (!left)
            return null;
        const token = this.match(">") || this.match(">=") || this.match("<") || this.match("<=");
        if (token) {
            const right = this.parseAddSub();
            if (!right)
                this.raiseError(`Expression expected after ${left} ${token.content}`);

            if (token.content === ">")
                return new More(left!, right!);
            else if (token.content === ">")
                return new MoreEqual(left!, right!);
            else if (token.content === "<")
                return new Less(left!, right!);
            else if (token.content === "<=")
                return new LessEqual(left!, right!);
            else {
                this.raiseError(`invalid operation ${token.content} after ${left}`);
            }
        }

        return left;
    }

    private parseAddSub(): Expression|null {
        let left = this.parseMulDiv();
        if (!left)
            return null;

        let token: LexToken|null;
        while ((token = (this.match("+") || this.match("-")))) {
            const right = this.parseMulDiv();
            if (!right)
                this.raiseError(`Expression expected after ${left} ${token.content}`);
            left = token.content === "+" ? new Addition (left!, right!) : new Subtraction(left!, right!);
        }

        return left;
    }

    private parseMulDiv(): Expression|null {
        let left = this.parseNegate();
        if (!left)
            return null;

        let token: LexToken|null;
        while ((token = (this.match("*") || this.match("/") || this.match("%")))) {
            const right = this.parseNegate();
            if (!right)
                this.raiseError(`Expression expected after ${left} ${token.content}`);

            switch (token.content) {
                case '*':
                    left = new Multiply(left!, right!);
                    break;
                case '/':
                    left = new Divide(left!, right!);
                    break;
                case '%':
                    left = new ModDivide(left!, right!);
                    break;
                default:
                    this.raiseError(`invalid operation ${token.content} after ${left}`);
            }
        }

        return left;
    }

    private parseNegate(): Expression|null {
        if (this.match("!") || this.match("-")) {
            const  _lex = this._lastMatched;

            const unit = this.parseToken();
            if (!unit)
                this.raiseError("Expression expected after !");
            return new NegateOp(_lex!, unit!, _lex!.line, _lex!.column);
        }
        return this.parseToken();
    }

    private parseToken(): Expression|null {
        if (this.match("(")) {
            const result = this.parseExpression();
            this.matchOrFail(")");
            return result;
        }

        return this.parseSwitch() || this.parseAlternative();
    }

    private parseAlternative(): Expression|null {
        let item = this.parseSimple();
        if (!item)
            return null;

        let token: LexToken|null;
        let array = [item];
        while ((token = this.match("|"))) {
            item = this.parseSimple();
            if (!item)
                this.raiseError(`Expression expected after ${item} ${token.content}`);
            array.push(item!);
        }

        if (array.length === 1)
            return array[0];
        else
            return new Alternative(array);
    }

    private parseSwitch(): Expression|null {
        if (this.match('switch')) {
            const switchLex = this._lastMatched!;
            this.matchOrFail('(');
            let sources: Expression[] = [];
            let matchers: SwitchMatcher[] = [];

            let exp = this.parseExpression();
            if (!exp) {
                this.raiseError("empty expression for switch clause");
            }

            sources.push(exp!);
            while (this.match(',')) {
                exp = this.parseExpression();
                if (!exp) {
                    this.raiseError("expression expected");
                }
                sources.push(exp!);
            }
            this.matchOrFail(')');
            this.matchOrFail('{');
            while (this.match('case')) {
                const caseLex = this._lastMatched!;
                const hasParen = this.match('(');
                let isFirstWildcard = false;
                let d: SwitchCompare[] = [];
                let exp: Expression|null;

                if (this.match('_')) {
                    exp = new TrueMatcher(this._lastMatched!.line, this._lastMatched!.column);
                    isFirstWildcard = true;
                }
                else {
                    exp = this.parseExpression();
                    if (!exp) this.raiseError("expression expected");
                    isFirstWildcard = false;
                }

                let i = 0;
                if (!exp) this.raiseError("expression expected");
                d.push(new SwitchCompare(sources[i++], exp!));

                while (this.match(',')) {
                    exp = this.match('_') ? new TrueMatcher(this._lastMatched!.line, this._lastMatched!.column) : this.parseExpression();
                    if (!exp) this.raiseError("expression expected");
                    d.push(new SwitchCompare(sources[i++], exp!));

                    if (d.length > sources.length) {
                        this.raiseError(`Extra matcher ${exp}: a tuple of exactly ${sources.length} items needed`);
                    }
                }

                if (d.length === 1 && isFirstWildcard) {
                    d = sources.map(s => new SwitchCompare(s, new TrueMatcher(this._lastMatched!.line, this._lastMatched!.column)));
                }
                else if (d.length !== sources.length) {
                    this.raiseError(`number of items in matcher ${d.length} does not match sources: ${sources.length}`);
                }

                if (hasParen)
                    this.matchOrFail(')');


                this.matchOrFail('=>');

                const result = this.parseExpression();
                if (!result) {
                    this.raiseError("expression expected when parsing case _ =>");
                }
                let matcher = new SwitchMatcher(caseLex.line, caseLex.column, d, result!);
                matchers.push(matcher);
            }

            this.matchOrFail('}');

            return new Switch(switchLex.line, switchLex.column, sources, matchers);
        }
        return null;
    }

    private parseSimple(): Expression|null {
        return this.parseConstant() || this.parseReference();
    }

    private parseConstant(): Expression|null {
        let unit: LexToken|null;
        if ((unit = this.matchString() || this.matchNumber() || this.matchColor() || this.match("true") || this.match("false"))) {
            return new Constant(unit);
        }

        if ((unit = this.match("nil"))) {
            return new Nil(unit);
        }

        return null;
    }

    private parseReference(): Expression|null {
        let unit: LexToken|null;
        if (this.match('.')) {
            const _lex = this._lastMatched!;

            unit = this.matchIdentifier();
            if (!unit) {
                this.raiseError("Identifier expected after '.'");
            }

            return new EnumValue(unit!.content, _lex.line, _lex.column);
        }
        else if ((unit = this.matchIdentifier())) {
            const l = unit.line;
            const c = unit.column;
            if (this.match('(')) { // function call
                let parameters: Array<Expression> = [];
                let param: Expression|null;
                while ((param = this.parseExpression())) {
                    parameters.push(param);
                    if (this.match(')')) {
                        break;
                    }
                    else {
                        this.matchOrFail(",");
                    }
                }
                return new FunctionCall(unit.line, unit.column, unit.content, parameters);
            }

            let kp = [unit.content];
            while (this.match('.')) {
                unit = this.matchIdentifier();
                if (!unit) {
                    this.raiseError(`Identifier expected after ${kp.join('.')}`)
                }
                kp.push(unit!.content);
            }

            return new Variable(kp.join('.'), l, c);
        }

        return null;
    }


    private parseLayout(): LayoutView|null {
        if (this.match('layout')) {
            const layout = new LayoutView();
            layout.line = this._lastMatched!.line;
            layout.column = this._lastMatched!.column;

            this.matchOrFail('{');

            let layer: Layer|null;
            while ((layer = this.parseLayer())) {
                layout!.addManagedView(layer);
            }

            this.matchOrFail('}');
            return layout;
        }

        return null;
    }

    private parseLayer(): Layer|null {

        if (this.match('layer')) {
            const _lex = this._lastMatched!;

            this.matchOrFail('{');

            const layer = new Layer();
            layer.line = _lex.line;
            layer.column = _lex.column;

            while(this.parseContainerContents(layer)) {}

            this.matchOrFail('}');

            return layer;
        }

        return null;
    }

    private parsePredefinedProperty(name: LexIdentifier, view: View): boolean {
        switch (name.content) {
            case 'padding':
            case 'contentPadding':
                this.parseViewProperties(view, name.content, 'left', 'right', 'top', 'bottom');
                return true;
            case 'size':
            case 'fixedSize':
                this.parseViewProperties(view, name.content, 'width', 'height');
                return true;
            case 'center':
                this.parseViewProperties(view, name.content, 'x', 'y');
                return true;
            case 'aspect':
                this.parsePropertyContents(view, name.content, name.content, name);
                return true;
            default:
                return false;
        }
    }

    private parseContainerContents(container: Container): boolean {
        const name = this.matchIdentifier();
        if (name) {
            if (this.parsePredefinedProperty(name, container)) return true;
            if (this.match('{')) {
                const view = this.viewForKey(name.content);
                if (!view) {
                    this.raiseError(`unknown view description: ${name.content}`);
                }
                view!.line = name.line;
                view!.column  = name.column;

                if (view instanceof Container) {
                    while (this.parseContainerContents(view)) {}
                }
                else {
                    while (this.parseViewContents(view!)) {}
                }

                container.addManagedView(view!);

                this.matchOrFail('}')
            }
            else {
                this.matchOrFail(':');

                const exp = this.parseExpression();
                if  (!exp) {
                    this.raiseError(`expression expected after ${name.content} :`);
                }
                const prop = container.property(name.content);
                if (!prop) {
                    this.raiseError(`property ${name.content} not found in ${container}`);
                }
                prop.value = exp!;
                prop.line = name.line;
                prop.column = name.column;
            }
            return true;
        }
        return false;
    }

    private parseViewContents(view: View): boolean {
        const name = this.matchIdentifier();
        if (name) {
            if (this.parsePredefinedProperty(name, view)) return true;

            this.matchOrFail(':');
            const exp = this.parseExpression();
            if (!exp) {
                this.raiseError(`property value required for ${name.content}`);
            }

            const prop = view.property(name.content);
            if (!prop) {
                this.raiseError(`property ${name.content} not found in ${view}`);
            }
            prop.value = exp!;
            prop.line = name.line;
            prop.column = name.column;

            return true;
        }

        return false;
    }

    private parseViewProperties(view: View, prefix: string, ...names: string[]): void {
        this.matchOrFail('{');
        let matched = true;
        while (matched) {
            matched = false;
            for (let t of names) {
                if (this.parseViewProperty(view, t, prefix + '.' + t)) {
                    matched = true;
                }
            }
        }
        this.matchOrFail('}');
    }

    private parseViewProperty(view: View, name: string, key: string): boolean {
        if (this.match(name)) {
            const propName = this._lastMatched!;
            this.parsePropertyContents(view, name, key, propName);

            return true;
        }
        return false;
    }

    private parsePropertyContents(view: View, name: string, key: string, propName: LexToken) {
        this.matchOrFail(':');
        const exp = this.parseExpression();
        const prop = view.property(key);

        if (!prop) {
            this.raiseError(`property  ${name} is not found in view ${view}`);
        }

        if (prop.value) {
            this.raiseError(`property  ${name} in view ${view} already has value ${prop.value}`);
        }
        prop.value = exp!;
        prop.line = propName.line;
        prop.column = propName.column;
    }

    private viewForKey(key: string): View|null {
        if (key === 'horizontal') {
            return new LinearLayout(LinearLayoutAxis.Horizontal);
        }
        if (key === 'vertical') {
            return new LinearLayout(LinearLayoutAxis.Vertical);
        }
        if (key === 'absolute') {
            return new AbsoluteLayout();
        }
        if (key === 'stack') {
            return new StackLayout();
        }
        if (key === 'label') {
            return new Label();
        }
        if (key === 'image') {
            return new ImageView();
        }
        if (key === 'gradient') {
            return new Gradient();
        }
        if (key === 'roundRect') {
            return new RoundRect();
        }
        if (key === 'progress') {
            return new Progress();
        }

        return this.bindings.viewForKey(key);
    }

    variableForKeyPath(keyPath: string): Expression|null {
        let kp = keyPath.split('.');
        let ret = this.properties as PropertyDeclaration;
        let line = 0, column = 0;
        for (let k of kp) {
            if (!ret) {
                break;
            }
            if (!(ret instanceof CompoundPropertyDeclaration)) {
                throw new LinkError(line, column, `property ${ret} does not have member ${k}`);
            }
            const t = ret.propertyWithName(k);
            if (t) ret = t;
        }

        if (ret instanceof ExpressionPropertyDeclaration) {
            return ret.expression;
        }

        return this.engine.variableForKeyPath(keyPath);
    }

    private match(s: string): LexToken|null {
        if(this._lexer.current().content === s) {
            this._lastMatched = this._lexer.current();
            this._lexer.next();
            return this._lastMatched;
        }

        return null;
    }

    private matchOrFail(s: string): LexToken {
        const r = this.match(s);
        if (!r) throw new ParseError(this._lexer.current().line, this._lexer.current().column, `${s} expected, but ${this._lexer.current().content} received`);
        return r;
    }

    private matchIdentifier(): LexIdentifier|null {
        if (this._lexer.current() instanceof LexIdentifier) {
            this._lastMatched = this._lexer.current();
            this._lexer.next();

            return this._lastMatched;
        }

        return null;
    }

    private matchString(): LexString|null {
        if (this._lexer.current() instanceof LexString) {
            this._lastMatched = this._lexer.current();
            this._lexer.next();

            return this._lastMatched;
        }

        return null;
    }

    private matchNumber(): LexNumber|null {
        if (this._lexer.current() instanceof LexNumber) {
            this._lastMatched = this._lexer.current();
            this._lexer.next();

            return this._lastMatched;
        }

        return null;
    }

    private matchColor(): LexColor|null {
        if (this._lexer.current() instanceof LexColor) {
            this._lastMatched = this._lexer.current();
            this._lexer.next();

            return this._lastMatched;
        }

        return null;
    }


    private raiseError(message: string): never {
        throw new ParseError(this._lexer.currentLine, this._lexer.currentColumn, message)
    }

    toString(): string {
        return `${this.bindings}\n${this.properties}\n${this.state.layout ? this.state.layout.toString() : ''}`;
    }

    render(): React.ReactElement<any, string | React.JSXElementConstructor<any>> | string | number | {} | React.ReactNodeArray | React.ReactPortal | boolean | null | undefined {
        return this.state.layout ? this.state.layout.target : undefined;
    }
}
