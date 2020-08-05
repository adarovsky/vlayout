import { AbsoluteLayout, LinearLayoutAxis, View, ViewProperty } from './view';
import { Layout, Scope } from './layout';
import { LexIdentifier } from './lexer';
import { Expression, Variable } from './expression';
import { Dictionary, ListDefinition, ListDefinitionItem, TypeDefinition } from './types';
import { Engine } from './engine';
import { FunctionImplementationI } from './builtin_functions';
import { LinkError } from './errors';
import { combineLatest, EMPTY, Observable, of, ReplaySubject } from 'rxjs';
import { finalize, map, switchMap } from 'rxjs/operators';
import React, { createElement } from 'react';
import { ReactListItemPrototype } from './react_list';
import { ListButton } from './primitives';
import { ReactHorizontalList } from './react_horizontal_list';
import { ReactVerticalList } from './react_vertical_list';
import { ReactAbsoluteList } from './react_absolute_list';
import { PrototypeCache } from './prototype_cache';
import { forIn, get, toPairs } from 'lodash';

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
                    const prop = get(m, this.keyPath);
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
        forIn(structure, (value, key) => {
            const path = prefix.length > 0 ? prefix + '.' + key : key;
            if (value instanceof TypeDefinition) {
                this.accessors[path] = new ListItemAccessor(path, value);
            }
            else {
                this.buildAccessors(source, value, path);
            }
        });
        this.accessors['index'] = new ListItemAccessor('index', this.engine.numberType());
    }

    linkPrototype(scope: Scope, model: Variable): void {
        const modelItem = (model.typeDefinition! as ListDefinition).values[this.name.content];
        if (modelItem) {
            this.buildAccessors(model.sink, modelItem, '');
        }
        else {
            throw new LinkError(this.line, this.column, `cannot find prototype ${this.name.content} in model ${model.typeDefinition!.typeName}`);
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
        forIn(what.accessors, a => this.accessors[a.keyPath] = a.instantiate());
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
        // this._key = uuid_v1();
        this._key = modelItem.id;
        this.modelItem.next(modelItem);
        this.modelItemSnapshot = modelItem;
    }

    viewType(): string {
        return `listPrototype_${this.name.content}`;
    }

    get target(): React.ReactElement<any, string | React.JSXElementConstructor<any>> {
        return createElement(ReactListItemPrototype, {parentView: this, key: this.name.content + '-' + this.key});
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
export type ListTextChangeHandler = (i: ListModelItem, s: string) => void;
export type ListEnterHandler = (i: ListModelItem) => void;

export class List extends View {
    model: Variable|null = null;
    tapHandler: Variable|null = null;
    tapCallback: ListClickHandler|null = null;
    prototypes: ListItemPrototype[] = [];
    private readonly reusableItems = new PrototypeCache(100);

    constructor(readonly axis: LinearLayoutAxis|null) {
        super();
        this.registerProperty(new ViewProperty('backgroundColor', 'Color'));
        this.registerProperty(new ViewProperty('scrollable', 'Bool'));
        if (this.axis !== null) {
            this.registerProperty(new ViewProperty('spacing', 'Number'));
        }
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

            this.model.sink = this.model.sink.pipe(
                map((arr: Dictionary<ListModelItem>[]) => arr.map(
                    (modelItem, index) => {
                        const [key, v] = toPairs(modelItem)[0];
                        const ret: { [x: string]: { index: number; id: string; }; } = {};
                        ret[key] = {...v, index};
                        return ret;
                    }
                ))
            );
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
                    combineLatest(arr.map(modelItem => {
                        const [key] = toPairs(modelItem)[0];
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
                        map(filtered => arr.filter((value, index) => filtered[index]))
                    ))
            );
        }
    }

    private createNewReusableItem(modelItem: Dictionary<ListModelItem>): ListItemPrototype {
        const [key] = toPairs(modelItem)[0];
        const proto = this.prototypes.find(p => p.name.content === key);
        if (!proto) {
            throw new LinkError(this.line, this.column, `model item ${key} not found`);
        }

        const real = proto.instantiate(); //cloneDeep(proto);
        real.parent = this;
        real.linkModel();
        return real;
    }

    availableItems() {
        return this.reusableItems.keys();
    }

    requestReusableItem(modelItem: Dictionary<ListModelItem>): ListItemPrototype {
        const [key, value] = toPairs(modelItem)[0];
        let item = this.reusableItems.take(value.id);

        if (!item || item.name.content != key) {
            item = this.createNewReusableItem(modelItem);
        }

        item.setModelItem(value);
        return item;
    }

    returnReusableItem(proto: ListItemPrototype) {
        this.reusableItems.put(proto);
    }


    get target(): React.ReactElement<any, string | React.JSXElementConstructor<any>> {
        let cls;
        switch (this.axis) {
            case null:
                cls = ReactAbsoluteList;
                break;
            case LinearLayoutAxis.Horizontal:
                cls = ReactHorizontalList;
                break;
            case LinearLayoutAxis.Vertical:
                cls = ReactVerticalList;
                break;

        }
        return createElement(cls, {parentView: this, key: this.key});
    }

    viewType(): string {
        return (this.axis === null ? 'absolute' : this.axis === LinearLayoutAxis.Horizontal ? 'horizontal' : 'vertical') + 'List';
    }
}

export function prototypeMatch(proto: ListItemPrototype, modelItem: Dictionary<ListModelItem>) {
    const [key, value] = toPairs(modelItem)[0];
    return key === proto.name.content && value.id === proto.modelItemSnapshot?.id;
}
