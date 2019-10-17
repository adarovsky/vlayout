import {AbsoluteLayout, LinearLayoutAxis, View} from "./view";
import {Layout, Scope} from "./layout";
import {LexIdentifier} from "./lexer";
import {Expression, Variable} from "./expression";
import {Dictionary, ListDefinition, TypeDefinition} from "./types";
import {Engine} from "./engine";
import {FunctionImplementationI} from "./builtin_functions";
import {LinkError} from "./errors";
import {BehaviorSubject, EMPTY, Observable, of, Subscription} from "rxjs";
import _ from "lodash";
import {switchMap} from "rxjs/operators";
import {createElement} from "react";
import {ReactList, ReactListItemPrototype} from "./react_list";
import uuid from "uuid";

class ListItemAccessor extends Expression {
    private modelSubject = new BehaviorSubject<any|null>(null);
    constructor(readonly keyPath: string) {
        super(0, 0);
        this.sink = this.modelSubject.pipe(
            switchMap(m => {
                if (m === null) {
                    return EMPTY;
                }
                const prop = _.get(m, this.keyPath);
                if (prop === undefined) {
                    return EMPTY;
                }

                if (prop instanceof Observable) {
                    return prop;
                }

                return of(prop);
            })
        )
    }

    setModelItem(modelItem: any) {
        this.modelSubject.next(modelItem);
    }

    toString(): string {
        return `<model>.${this.keyPath}`;
    }
}

export class ListItemPrototype extends AbsoluteLayout implements Scope {
    name: string;

    accessors: Dictionary<ListItemAccessor> = {};
    private subscription: Subscription|null = null;

    constructor(name: LexIdentifier, readonly layout: Layout) {
        super();
        this.name = name.content;
        this.line = name.line;
        this.column = name.column;
    }

    private buildAccessors(source: Observable<any>, structure: Dictionary<any>, prefix: string): void {
        _.forIn(structure, (value, key) => {
            const path = prefix.length > 0 ? prefix + '.' + key : key;
            if (value instanceof TypeDefinition) {
                this.accessors[path] = new ListItemAccessor(path);
            }
            else {
                this.buildAccessors(source, value, path);
            }
        });
    }

    linkPrototype(scope: Scope, model: Variable): void {
        const modelItem = (model.typeDefinition! as ListDefinition).values[this.name];
        if (modelItem) {
            this.buildAccessors(model.sink, modelItem, '');
            super.link(this);
        }
        else {
            throw new LinkError(this.line, this.column, `cannot find prototype ${this.name} in model ${model.typeDefinition!.typeName}`);
        }
    }

    linkModel(): void {
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
        return this.accessors[keyPath] || this.layout.variableForKeyPath(keyPath);
    }

    setModelItem(modelItem: any|null): void {
        this._key = modelItem['id'] || uuid.v1();
        _.forIn(this.accessors, a => a.setModelItem(modelItem));
    }

    viewType(): string {
        return `listPrototype_${this.name}`;
    }

    get target(): React.ReactElement<any, string | React.JSXElementConstructor<any>> {
        return createElement(ReactListItemPrototype, {parentView: this, key: this.key});
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
            const t = this.model.typeDefinition;
            if (t && t instanceof ListDefinition) {
                this.prototypes.forEach(p => p.linkPrototype(scope, this.model!));
            } else if (t) {
                throw new LinkError(this.line, this.column, `model type '${t.typeName}' is not a model list`);
            }
            else {
                throw new LinkError(this.line, this.column, `model should be set for list to work`);
            }
        }
    }

    private createNewReusableItem(modelItem: any): ListItemPrototype {
        const [key, value] = _.toPairs(modelItem)[0];
        const proto = this.prototypes.find(p => p.name === key);
        if (!proto) {
            throw new LinkError(this.line, this.column, `model item ${key} not found`);
        }

        const real = _.cloneDeep(proto);
        real.linkModel();
        return real;
    }

    requestReusableItem(modelItem: any): ListItemPrototype {
        const item = this.createNewReusableItem(modelItem);
        const [, value] = _.toPairs(modelItem)[0];
        item.setModelItem(value);
        return item;
    }

    returnReusableItem(proto: ListItemPrototype) {
        proto.setModelItem(null);
    }


    get target(): React.ReactElement<any, string | React.JSXElementConstructor<any>> {
        return createElement(ReactList, {parentView: this, key: this.key});
    }

    viewType(): string {
        return (this.axis == LinearLayoutAxis.Horizontal ? 'horizontal' : 'vertical') + 'List';
    }
}