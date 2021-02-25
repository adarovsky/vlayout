import { Engine } from './engine';
import { Bindings } from './bindings';
import { LexColor, Lexer, LexIdentifier, LexNumber, LexString, LexToken } from './lexer';
import { CompoundPropertyDeclaration, ExpressionPropertyDeclaration, PropertyDeclaration } from './properties';
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
    Variable,
} from './expression';
import {
    AbsoluteLayout,
    Container,
    Layer,
    LayoutView,
    LinearLayout,
    LinearLayoutAxis,
    StackLayout,
    View,
} from './view';
import { Gradient, ImageView, Label, ListButton, ListTextField, Progress, RoundRect } from './primitives';
import { LinkError } from './errors';
import React, { Component } from 'react';
import { FunctionDeclaration, Functions } from './functions';
import { Dictionary, EnumDefinition, ListDefinition, ListDefinitionItem, TypeDefinition } from './types';
import { FunctionImplementationI } from './builtin_functions';
import { List, ListItemPrototype } from './list';
import { extend, forIn, isEmpty } from 'lodash';

export class ParseError extends Error {
    constructor(line: number, column: number, message: string) {
        super(`${line}:${column}: ${message}`)
    }
}

export interface LayoutProps {
    engine: Engine;
    content: string;
    className?: string;
}

interface LayoutState {
    layout: LayoutView|null;
}

export interface Scope {
    engine: Engine;
    variableForKeyPath(keyPath: string): Expression|null;
    functionFor(name: string, parameters: TypeDefinition[]): FunctionImplementationI;
    functionsLoose(name: string, parametersCount: number): FunctionImplementationI[];
    viewForKey(key: string): View|null;
}

export class Layout extends Component<LayoutProps, LayoutState> implements Scope {
    readonly bindings: Bindings;
    properties: CompoundPropertyDeclaration|null = null;
    functions: Functions|null = null;

    private _lexer: Lexer;
    private _lastMatched: LexToken|null = null;
    state: LayoutState;
    readonly valueSnapshot: Dictionary<any> = {};

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
        this.parseFunctions();
        const l = this.parseLayout();

        if (this.functions) {
            this.functions.link(this);
        }

        if (l) {
            l.link(this);
        }
        else {
            throw new Error(`no layout parsed!`);
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
        let name;
        if ((name = this.matchIdentifier())) {
            this.matchOrFail(":");
            if (!this.parseEnum(name.content) && !this.parseList(name.content)) {
                this.raiseError("enum or list declaration expected");
            }
            return true;
        }

        return false;
    }

    private parseEnum(name: string): Array<string>|null {

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

            const e = this.engine.type(name);
            if (!e) {
                this.raiseError(`enum ${name} is not registered`);
            }
            if (!(e instanceof EnumDefinition)) {
                this.raiseError(`${name} is not a enum definition`);
            }

            return r;
        }

        return null;
    }

    private parseList(name: string): Dictionary<ListDefinitionItem> | null {

        if (this.match("list")) {
            let r: Dictionary<ListDefinitionItem> = {};

            this.matchOrFail('(');

            do {
                let v = this.matchIdentifier();
                if (v) {
                    const item: ListDefinitionItem = {};
                    this.matchOrFail('{');
                    let i: ListDefinitionItem|null = null;
                    while( !isEmpty(i = this.parseListItem()) ) {
                        extend(item, i);
                    }
                    this.matchOrFail('}');
                    r[v.content] = item;
                }
                else {
                    this.raiseError(`model item identifier expected`)
                }
            } while (this.match(','));

            this.matchOrFail(')');

            const model = this.engine.type(name);
            if (!model) {
                this.raiseError(`list ${name} is not registered`);
            }
            if (!(model instanceof ListDefinition)) {
                this.raiseError(`${name} is not a list definition`);
            }

            this.compareTypes(name, r, model.values);
            return r;
        }

        return null;
    }

    private compareTypes(context: string, item1: ListDefinitionItem|TypeDefinition, item2: ListDefinitionItem|TypeDefinition) {
        if (item1 instanceof TypeDefinition) {
            if (item2 !== item1) {
                this.raiseError(`types ${item1} and ${item2} do not match`);
            }
            return;
        }
        else if (item2 instanceof TypeDefinition) {
            this.raiseError(`types ${item1} and ${item2} do not match`);
        }

        forIn(item1, (v, k) => {
            if (!item2[k]) {
                this.raiseError(`type ${k} is missing in engine`);
            }
            this.compareTypes(k, v, item2[k]);
        });

        // _.forIn(item2, (v, k) => {
        //     if (!item1[k]) {
        //         this.raiseError(`${context}: ${k} is missing in engine`);
        //     }
        // });
    }

    private parseListItem(): ListDefinitionItem {
        let v = this.matchIdentifier();
        if (v) {
            const item: ListDefinitionItem = {};
            if (this.match(':')) {
                const typeName = this.matchIdentifier();
                if (typeName) {
                    const type = this.engine.type(typeName.content);
                    if (type) {
                        item[v.content] = type;
                    }
                    else {
                        this.raiseError(`unknown type ${typeName.content}`);
                    }
                }
                else {
                    this.raiseError('type name expected');
                }
            }
            else if (this.match('{')) {
                const inner: ListDefinitionItem = {};
                let i: ListDefinitionItem|null = null;
                while( !isEmpty(i = this.parseListItem()) ) {
                    extend(inner, i);
                }
                this.matchOrFail('}');

                item[v.content] = inner;
            }
            return item;
        } else {
            return {};
        }
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
            this.properties = new CompoundPropertyDeclaration("", this._lastMatched!.line, this._lastMatched!.column);
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

    private parseFunctions(): void {
        if (this.match('functions')) {
            this.functions = new Functions(this._lastMatched!.line, this._lastMatched!.column);
            this.matchOrFail('{');
            let p: FunctionDeclaration|null;
            while ((p = this.parseFunction())) {
                this.functions.registerFunction(p);
            }
            this.matchOrFail('}');
        }
    }

    private parseFunction(): FunctionDeclaration|null {
        const name = this.matchIdentifier();
        if (name) {
            const func = new FunctionDeclaration(name, this);
            this.matchOrFail('(');
            let paramName;
            while( (paramName = this.matchIdentifier()) ) {
                this.matchOrFail(':');
                const paramType = this.matchIdentifier();
                if (paramType) {
                    func.addArgument(paramName, paramType.content);
                }
                else {
                    this.raiseError('function parameter type expected');
                }
                if (!this.match(',')) break;
            }
            this.matchOrFail(')');
            this.matchOrFail('=>');
            func.expression = this.parseExpression();
            if (!func.expression) {
                this.raiseError('function body expected');
            }

            return func;
        }

        return null;
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
            else if (token.content === ">=")
                return new MoreEqual(left!, right!);
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
                    if (i >= sources.length) {
                        this.raiseError(`Extra matcher ${exp}: a tuple of exactly ${sources.length} items needed`);
                    }
                    exp = this.match('_') ? new TrueMatcher(this._lastMatched!.line, this._lastMatched!.column) : this.parseExpression();
                    if (!exp) this.raiseError("expression expected");
                    d.push(new SwitchCompare(sources[i++], exp!));
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
        this.matchOrFail('layout');
        const layout = new LayoutView(this.props.className);
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

    private parseListContents(list: List): boolean {
        const name = this.matchIdentifier();
        if (name) {
            if (this.parsePredefinedProperty(name, list)) return true;
            if (name.content === 'model') {
                this.matchOrFail(':');
                const ref = this.parseReference();
                if (!ref) {
                    this.raiseError(`model reference expected`);
                }
                else if (ref instanceof Variable) {
                    list.model = ref;
                    return true;
                }
                else {
                    this.raiseError(`only input references supported in models`);
                }
            }
            else if (name.content === 'itemTapped') {
                this.matchOrFail(':');
                const ref = this.parseReference();
                if (!ref) {
                    this.raiseError(`model reference expected`);
                }
                else if (ref instanceof Variable) {
                    list.tapHandler = ref;
                    return true;
                }
                else {
                    this.raiseError(`only input references supported in models`);
                }
            }
            if (this.match(':')) {
                const exp = this.parseExpression();
                if (exp) {
                    const prop = list.property(name.content);
                    if (prop) {
                        prop.value = exp;
                    } else {
                        this.raiseError(`property ${name.content} is not found in ${list}`);
                    }
                }
            }
            else {
                const proto = new ListItemPrototype(name, this);
                proto.parent = list;
                this.matchOrFail('{');
                while (this.parseContainerContents(proto)) {
                }
                this.matchOrFail('}');
                list.prototypes.push(proto);
            }

            return true;
        }
        return false;
    }


    private parseContainerContents(container: Container): boolean {
        const name = this.matchIdentifier();
        if (name) {
            if (this.parsePredefinedProperty(name, container)) return true;
            if (this.match('{')) {
                let view = this.viewForContext(container, name.content);
                if (view) {
                    container.addManagedView(view!);
                    this.setupView(view, name);
                    this.matchOrFail('}');
                    return true;
                } else if (isListMember(container)) {
                    const callback = this.engine.listButtonForKey(name.content);
                    if (callback) {
                        view = new ListButton(callback);
                        while (this.parseViewContents(view!)) {}
                        container.addManagedView(view!);
                        this.matchOrFail('}');
                        return true;
                    }
                    else {
                        const handler = this.engine.listTextFieldForKey(name.content);
                        if (handler) {
                            view = new ListTextField(name.content, handler.onChange, handler.onEnter);
                            while (this.parseViewContents(view!)) {}
                            container.addManagedView(view!);
                            this.matchOrFail('}');
                            return true;
                        }
                    }
                }

                this.raiseError(`unknown view description: ${name.content}`);
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

    private setupView(view: View, name: LexIdentifier) {
        view.line = name.line;
        view.column = name.column;

        if (view instanceof Container) {
            while (this.parseContainerContents(view)) {
            }
        } else if (view instanceof List) {
            while (this.parseListContents(view)) {
            }
        } else {
            while (this.parseViewContents(view!)) {
            }
        }
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

    viewForKey(key: string): View|null {
        switch (key) {
            case 'horizontal':
                return new LinearLayout(LinearLayoutAxis.Horizontal);
            case 'vertical':
                return new LinearLayout(LinearLayoutAxis.Vertical);
            case 'absolute':
                return new AbsoluteLayout();
            case 'stack':
                return new StackLayout();
            case 'label':
                return new Label();
            case 'image':
                return new ImageView();
            case 'gradient':
                return new Gradient();
            case 'roundRect':
                return new RoundRect();
            case 'progress':
                return new Progress();
            case 'absoluteList':
                return new List(null);
            case 'verticalList':
                return new List(LinearLayoutAxis.Vertical);
            case 'horizontalList':
                return new List(LinearLayoutAxis.Horizontal);
            default:
                return this.bindings.viewForKey(key);
        }
    }

    viewForContext(container: Container, key: string) {
        if (isListMember(container)) {
            const view = this.engine.listViewForKey(key);
            if (view) return view;
        }

        return this.viewForKey(key);
    }

    listViewForKey(key: string): View|null {
        return this.engine.listViewForKey(key);
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
            return ret;
        }

        return this.engine.variableForKeyPath(keyPath);
    }

    functionFor(name: string, parameters: TypeDefinition[]): FunctionImplementationI {
        const f = this.functions ? this.functions.functionFor(name, parameters) : null;
        if (f) return f;

        return this.engine.functionFor(name, parameters);
    }

    functionsLoose(name: string, parametersCount: number): FunctionImplementationI[] {
        const arr = this.functions ? this.functions.functionsLoose(name, parametersCount) : [];
        return arr.concat(this.engine.functionsLoose(name, parametersCount));
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

    render() {
        return this.state.layout ? this.state.layout.target : null;
    }

}

function isListMember(view: View): boolean {
    let p: View|null = view;
    while (p) {
        if (p instanceof ListItemPrototype) {
            return true;
        }
        p = p.parent;
    }

    return false;
}
