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
import { isNotNull } from './utils';

export interface ListModelItem extends Dictionary<any> {
    id: string;
    isEqual?: (other: ListModelItem) => boolean;
}

abstract class ListBasicAccessor extends Expression {
    protected constructor(readonly keyPath: string) {
        super(0, 0);
    }
}

class ListItemAccessor extends ListBasicAccessor {
    constructor(keyPath: string, type: TypeDefinition) {
        super(keyPath);
        this.typeDefinition = type;
    }

    instantiate(): this {
        const v = new (this.constructor as typeof ListItemAccessor)(this.keyPath, this.typeDefinition!);
        return v as this;
    }


    link(scope: Scope, hint: TypeDefinition | null): void {
        if (scope instanceof ListItemPrototype) {
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
                }),
            );
        } else {
            throw new LinkError(this.line, this.column, `accessor should be in list prototype item, but got ${scope}`);
        }
    }

    toString(): string {
        return `<model>.${this.keyPath}`;
    }
}

class ListIndexAccessor extends ListBasicAccessor {

    constructor() {
        super('index');
    }

    instantiate(): this {
        const v = new (this.constructor as typeof ListIndexAccessor)();
        return v as this;
    }


    link(scope: Scope, hint: TypeDefinition | null): void {
        this.typeDefinition = scope.engine.numberType();
        if (scope instanceof ListItemPrototype) {
            this.sink = scope.index;
        } else {
            throw new LinkError(this.line, this.column, `accessor should be in list prototype item, but got ${scope}`);
        }
    }

    toString(): string {
        return `<model>.index`;
    }
}

export class ListItemPrototype extends AbsoluteLayout implements Scope {
    accessors: Dictionary<ListBasicAccessor> = {};
    modelItem = new ReplaySubject<ListModelItem>(1);
    modelItemSnapshot: ListModelItem | null = null;
    index = new ReplaySubject<number>(1);

    constructor(readonly name: LexIdentifier, readonly layout: Layout) {
        super();
        this.line = name.line;
        this.column = name.column;
        this.registerProperty(new ViewProperty('filter', 'Bool'));
    }

    get engine(): Engine {
        return this.layout.engine;
    }

    getTargetWithRef(ref: React.Ref<HTMLDivElement>): React.ReactElement {
        return createElement(ReactListItemPrototype, {
            parentView: this,
            key: this.name.content + '-' + this.key,
            innerRef: ref
        });
    }

    linkPrototype(scope: Scope, model: Variable): void {
        const modelItem = (model.typeDefinition! as ListDefinition).values[
            this.name.content
        ];
        if (modelItem) {
            this.buildAccessors(model.sink, modelItem, '');
        } else {
            throw new LinkError(
                this.line,
                this.column,
                `cannot find prototype ${this.name.content} in model ${
                    model.typeDefinition!.typeName
                }`
            );
        }
    }

    instantiate(): this {
        const v = new (this.constructor as typeof ListItemPrototype)(
            this.name,
            this.layout
        );
        v.copyFrom(this);
        return v as this;
    }

    copyFrom(what: this): void {
        super.copyFrom(what);
        this.accessors = {};
        forIn(
            what.accessors,
            (a) => (this.accessors[a.keyPath] = a.instantiate())
        );
    }

    linkModel(): void {
        super.link(this);
    }

    functionFor(
        name: string,
        parameters: TypeDefinition[]
    ): FunctionImplementationI {
        return this.layout.functionFor(name, parameters);
    }

    functionsLoose(
        name: string,
        parametersCount: number
    ): FunctionImplementationI[] {
        return this.layout.functionsLoose(name, parametersCount);
    }

    variableForKeyPath(keyPath: string): Expression | null {
        return (
            this.accessors[keyPath] || this.layout.variableForKeyPath(keyPath)
        );
    }

    setModelItem(modelItem: ListModelItem, index: number): void {
        // this._key = uuid_v1();
        const equal =
            modelItem === this.modelItemSnapshot ||
            (isNotNull(this.modelItemSnapshot) &&
                modelItemsEqual({item: modelItem}, {item: this.modelItemSnapshot}));

        if (!equal) {
            this._key = modelItem.id;
        }
        this.index.next(index);
        if (!equal) {
            this.modelItem.next(modelItem);
            this.modelItemSnapshot = modelItem;
        }
    }

    viewType(): string {
        return `listPrototype_${this.name.content}`;
    }

    viewForKey(key: string): View | null {
        const handler = this.engine.listButtonForKey(key);
        if (handler) {
            return new ListButton(handler);
        }
        return this.layout.viewForKey(key);
    }

    private buildAccessors(
        source: Observable<any>,
        structure: ListDefinitionItem,
        prefix: string
    ): void {
        forIn(structure, (value, key) => {
            const path = prefix.length > 0 ? prefix + '.' + key : key;
            if (value instanceof TypeDefinition) {
                this.accessors[path] = new ListItemAccessor(path, value);
            } else {
                this.buildAccessors(source, value, path);
            }
        });
        this.accessors['index'] = new ListIndexAccessor();
    }
}

export type ListClickHandler = (i: ListModelItem) => Promise<void>;
export type ListTextChangeHandler = (i: ListModelItem, s: string) => void;
export type ListEnterHandler = (i: ListModelItem) => void;

export class List extends View {
    model: Variable | null = null;
    tapHandler: Variable | null = null;
    tapCallback: ListClickHandler | null = null;
    prototypes: ListItemPrototype[] = [];
    private readonly reusableItems = new PrototypeCache(100);

    constructor(readonly axis: LinearLayoutAxis | null) {
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

    getTargetWithRef(ref: React.Ref<HTMLDivElement>): React.ReactElement {
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
        return createElement(cls, { parentView: this, key: this.key, innerRef: ref });
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
            } else {
                throw new LinkError(this.line, this.column, `model should be set for list to work`);
            }
        } else {
            throw new LinkError(this.line, this.column, `model should be set for list to work`);
        }

        if (this.tapHandler) {
            if (scope.engine.listButtonForKey(this.tapHandler.keyPath)) {
                this.tapCallback = scope.engine.listButtonForKey(this.tapHandler.keyPath);
            } else {
                throw new LinkError(this.line, this.column, `list button '${this.tapHandler.keyPath}' is not found`);
            }
        }

        const hasFilter = this.prototypes.reduce(((previousValue, currentValue) =>
            previousValue || !!currentValue.property('filter')?.value), false);
        if (hasFilter) {
            this.model.sink = this.model.sink.pipe(
                switchMap((arr: Dictionary<ListModelItem>[]) =>
                    combineLatest(arr.map((modelItem, index) => {
                        const [key] = toPairs(modelItem)[0];
                        const prop = this.prototypes.find(p => p.name.content === key);
                        if (prop) {
                            const p = this.requestReusableItem(modelItem, index);
                            const filter = p.property('filter')?.value?.sink ?? null;

                            if (filter) {
                                return filter.pipe(finalize(() => this.returnReusableItem(p)));
                            } else {
                                this.returnReusableItem(p);
                            }
                        }
                        return of(true);
                    })).pipe(
                        map(filtered => arr.filter((value, index) => filtered[index])),
                    )),
            );
        }
    }

    availableItems() {
        return this.reusableItems.keys();
    }

    requestReusableItem(modelItem: Dictionary<ListModelItem>, index: number): ListItemPrototype {
        const [key, value] = toPairs(modelItem)[0];
        let item = this.reusableItems.take(value.id);

        if (!item || item.name.content != key) {
            item = this.createNewReusableItem(modelItem);
        }

        item.setModelItem(value, index);
        return item;
    }

    returnReusableItem(proto: ListItemPrototype) {
        this.reusableItems.put(proto);
    }

    viewType(): string {
        return (this.axis === null ? 'absolute' : this.axis === LinearLayoutAxis.Horizontal ? 'horizontal' : 'vertical') + 'List';
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
}

export function prototypeMatch(proto: ListItemPrototype, modelItem: Dictionary<ListModelItem>) {
    const [key, value] = toPairs(modelItem)[0];
    return key === proto.name.content && value.id === proto.modelItemSnapshot?.id;
}

export function modelItemsEqual(
    x: Dictionary<ListModelItem>,
    y: Dictionary<ListModelItem>
): boolean {
    const [key1, value1] = toPairs(x)[0];
    const [key2, value2] = toPairs(y)[0];
    return (
        key1 === key2 &&
        (value1 === value2 ||
            (isNotNull(value1.isEqual) && value1.isEqual(value2)) ||
            (isNotNull(value2.isEqual) && value2.isEqual(value1)))
    );
}
