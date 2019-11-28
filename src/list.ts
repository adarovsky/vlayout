import {AbsoluteLayout, LinearLayoutAxis, View, ViewProperty} from "./view";
import {Layout, Scope} from "./layout";
import {LexIdentifier} from "./lexer";
import {Expression, Variable} from "./expression";
import {Dictionary, ListDefinition, ListDefinitionItem, TypeDefinition} from "./types";
import {Engine} from "./engine";
import {FunctionImplementationI} from "./builtin_functions";
import {LinkError} from "./errors";
import {combineLatest, EMPTY, Observable, of, ReplaySubject} from "rxjs";
import _ from "lodash";
import {finalize, map, switchMap, tap} from "rxjs/operators";
import {createElement} from "react";
import {ReactHorizontalList, ReactListItemPrototype, ReactVerticalList} from "./react_list";
import uuid from "uuid";
import {ListButton} from "./primitives";

export interface ListModelItem extends Dictionary<any> {
    id: string;
}

class ListItemAccessor extends Expression {

    constructor(readonly keyPath: string, type: TypeDefinition) {
        super(0, 0);
        this.typeDefinition = type;
    }

    instantiate(): this {
        const v = new (this.constructor as typeof ListItemAccessor)(this.keyPath, this.typeDefinition!);
        return v as this;
    }


    link(scope: Scope, hint: TypeDefinition | null): void {
        if (scope instanceof  ListItemPrototype) {
            this.sink = scope.modelItem.pipe(
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
            );
        }
        else {
            throw new LinkError(this.line, this.column, `accessor should be in list prototype item, but got ${scope}`);
        }
    }

    toString(): string {
        return `<model>.${this.keyPath}`;
    }
}

export class ListItemPrototype extends AbsoluteLayout implements Scope {

    accessors: Dictionary<ListItemAccessor> = {};
    modelItem = new ReplaySubject<ListModelItem>(1);
    modelItemSnapshot: ListModelItem|null = null;

    constructor(readonly  name: LexIdentifier, readonly layout: Layout) {
        super();
        this.line = name.line;
        this.column = name.column;
        this.registerProperty(new ViewProperty('filter', 'Bool'));
    }

    private buildAccessors(source: Observable<any>, structure: ListDefinitionItem, prefix: string): void {
        _.forIn(structure, (value, key) => {
            const path = prefix.length > 0 ? prefix + '.' + key : key;
            if (value instanceof TypeDefinition) {
                this.accessors[path] = new ListItemAccessor(path, value);
            }
            else {
                this.buildAccessors(source, value, path);
            }
        });
    }

    linkPrototype(scope: Scope, model: Variable): void {
        const modelItem = (model.typeDefinition! as ListDefinition).values[this.name.content];
        if (modelItem) {
            this.buildAccessors(model.sink, modelItem, '');
            super.link(this);
        }
        else {
            throw new LinkError(this.line, this.column, `cannot find prototype ${this.name} in model ${model.typeDefinition!.typeName}`);
        }
    }

    instantiate(): this {
        const v = new (this.constructor as typeof ListItemPrototype)(this.name, this.layout);
        v.copyFrom(this);
        return v as this;
    }

    copyFrom(what: this): void {
        super.copyFrom(what);
        this.accessors = {};
        _.forIn(what.accessors, a => this.accessors[a.keyPath] = a.instantiate());
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

    setModelItem(modelItem: ListModelItem): void {
        this._key = uuid.v1();
        this.modelItem.next(modelItem);
        this._key = modelItem.id;
        this.modelItemSnapshot = modelItem;
    }

    viewType(): string {
        return `listPrototype_${this.name.content}`;
    }

    get target(): React.ReactElement<any, string | React.JSXElementConstructor<any>> {
        return createElement(ReactListItemPrototype, {parentView: this, key: this.key});
    }

    viewForKey(key: string): View | null {
        const handler = this.engine.listButtonForKey(key);
        if (handler) {
            return new ListButton(handler);
        }
        return this.layout.viewForKey(key);
    }
}

export type ListClickHandler = (i: ListModelItem) => Promise<void>;

export class List extends View {
    model: Variable|null = null;
    tapHandler: Variable|null = null;
    tapCallback: ListClickHandler|null = null;
    prototypes: ListItemPrototype[] = [];
    private readonly reusableItems: Dictionary<ListItemPrototype[]> = {};

    constructor(readonly axis: LinearLayoutAxis) {
        super();
        this.registerProperty(new ViewProperty('spacing', 'Number'));
        this.registerProperty(new ViewProperty('backgroundColor', 'Color'));
        if (this.axis === LinearLayoutAxis.Horizontal) {
            this.registerProperty(new ViewProperty('alignment', 'LayoutAlignment'));
        }
    }

    instantiate(): this {
        const v = new (this.constructor as typeof List)(this.axis);
        v.copyFrom(this);
        return v as this;
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
        else {
            throw new LinkError(this.line, this.column, `model should be set for list to work`);
        }

        if (this.tapHandler) {
            if (scope.engine.listButtonForKey(this.tapHandler.keyPath)) {
                this.tapCallback = scope.engine.listButtonForKey(this.tapHandler.keyPath);
            }
            else {
                throw new LinkError(this.line, this.column, `list button '${this.tapHandler.keyPath}' is not found`);
            }
        }

        const hasFilter = this.prototypes.reduce(((previousValue, currentValue) =>
            previousValue || !!currentValue.property('filter')?.value), false);
        if (hasFilter) {
            this.model.sink = this.model.sink.pipe(
                switchMap((arr: Dictionary<ListModelItem>[]) =>
                    combineLatest(_.map(arr, modelItem => {
                        const [key] = _.toPairs(modelItem)[0];
                        const prop = this.prototypes.find(p => p.name.content === key);
                        if (prop) {
                            const p = this.requestReusableItem(modelItem);
                            const filter = p.property('filter')?.value?.sink ?? null;

                            if (filter) {
                                return filter.pipe(finalize(() => this.returnReusableItem(p)));
                            }
                            else {
                                this.returnReusableItem(p);
                            }
                        }
                        return of(true);
                    })).pipe(
                        map(filtered => arr.filter((value, index) => filtered[index])),
                        tap(console.log)
                    ))
            );
        }
    }

    private createNewReusableItem(modelItem: Dictionary<ListModelItem>): ListItemPrototype {
        const [key] = _.toPairs(modelItem)[0];
        const proto = this.prototypes.find(p => p.name.content === key);
        if (!proto) {
            throw new LinkError(this.line, this.column, `model item ${key} not found`);
        }

        const real = proto.instantiate(); //_.cloneDeep(proto);
        real.parent = this;
        real.linkModel();
        return real;
    }

    requestReusableItem(modelItem: Dictionary<ListModelItem>): ListItemPrototype {
        const [key, value] = _.toPairs(modelItem)[0];
        const item = this.reusableItems[key] && this.reusableItems[key].length > 0 ?
            this.reusableItems[key].splice(0, 1)[0] :
            this.createNewReusableItem(modelItem);
        item.setModelItem(value);
        return item;
    }

    returnReusableItem(proto: ListItemPrototype) {
        if (!this.reusableItems[proto.name.content]) {
            this.reusableItems[proto.name.content] = [];
        }
        this.reusableItems[proto.name.content].push(proto);
        proto.modelItemSnapshot = null;
    }


    get target(): React.ReactElement<any, string | React.JSXElementConstructor<any>> {
        return createElement(this.axis == LinearLayoutAxis.Horizontal ? ReactHorizontalList : ReactVerticalList, {parentView: this, key: this.key});
    }

    viewType(): string {
        return (this.axis == LinearLayoutAxis.Horizontal ? 'horizontal' : 'vertical') + 'List';
    }
}