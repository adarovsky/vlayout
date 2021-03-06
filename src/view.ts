import { Constant, EnumValue, Expression } from './expression';
import { Dictionary } from './types';
import { Scope } from './layout';
import React, { createElement } from 'react';
import {
    ReactContainer,
    ReactView,
    ReactViewProps,
    ReactViewState,
} from './react_views';
import { v1 as uuid_v1 } from 'uuid';
import {
    ReactHorizontalLayout,
    ReactLayer,
    ReactTopLayout,
    ReactVerticalLayout,
} from './react_layouts';
import { LexNumber } from './lexer';
import { take } from 'rxjs/operators';
import { ReactStackLayout } from './react_stack';
import { ReactAbsoluteLayout } from './react_absolute';
import { forIn, values } from 'lodash';
import { Tooltip } from './tooltip';
import { ReactButton } from './react_button';
import Tippy from '@tippyjs/react';
import { TooltipComponent } from './react_tooltip';

export class ViewProperty {
    line: number = 0;
    column: number = 0;

    name: string;
    typeName: string;
    value: Expression | null = null;
    view: View | null = null;

    constructor(name: string, typeName: string) {
        this.name = name;
        this.typeName = typeName;
    }

    instantiate(): this {
        const v = new (this.constructor as typeof ViewProperty)(
            this.name,
            this.typeName
        );
        if (this.value) v.value = this.value.instantiate();
        return v as this;
    }

    link(scope: Scope): void {
        if (this.value) {
            this.value.link(scope, scope.engine.type(this.typeName));
        }
    }

    toString(padding: number = 0): string {
        return `${' '.repeat(padding)}${this.name}: ${
            this.value ? this.value.toString() : '<empty>'
        }`;
    }
}

export class View {
    line: number = 0;
    column: number = 0;

    parent: View | null = null;
    tooltip: Tooltip | null = null;
    scope: Scope | null = null;

    protected properties: Dictionary<ViewProperty> = {};
    protected _key: string;
    instance: ReactView<ReactViewProps, ReactViewState> | null = null;

    constructor() {
        this.registerProperty(new ViewProperty('id', 'String'));
        ['left', 'right', 'top', 'bottom'].forEach((t) => {
            this.registerProperty(new ViewProperty('padding.' + t, 'Number'));
        });

        ['x', 'y'].forEach((t) => {
            this.registerProperty(new ViewProperty('center.' + t, 'Number'));
        });

        ['width', 'height'].forEach((t) => {
            this.registerProperty(new ViewProperty('size.' + t, 'Number'));
            this.registerProperty(new ViewProperty('fixedSize.' + t, 'Number'));
        });

        this.registerProperty(new ViewProperty('aspect', 'Number'));
        this.registerProperty(new ViewProperty('alpha', 'Number'));
        this.registerProperty(new ViewProperty('sizePolicy', 'SizePolicy'));
        this.registerProperty(new ViewProperty('class', 'String'));
        this._key = uuid_v1();
    }

    get key(): string {
        let key = this._key;
        const idProp = this.property('id');
        if (idProp.value)
            idProp.value.sink.pipe(take(1)).subscribe((i) => (key = i));

        return key;
    }

    copyFrom(that: this) {
        this.properties = {};
        this.tooltip = that.tooltip?.instantiate() ?? null
        forIn(that.properties, (p) => this.registerProperty(p.instantiate()));
    }

    link(scope: Scope): void {
        this.scope = scope;

        if (!this.property('alpha').value) {
            const n = new LexNumber(0, 0);
            n.content = '1';
            this.property('alpha').value = new Constant(n);
        }
        forIn(this.properties, (p) => {
            p.link(scope);
        });

        this.tooltip?.link(scope);
    }

    get target(): React.ReactElement {
        if (this.tooltip) {
            return createElement(
                TooltipComponent,
                {
                    key: this.key,
                    tooltip: this.tooltip,
                    content: this
                }
            );
        } else {
            return this.getTargetWithRef(null);
        }
    }

    getTargetWithRef(ref: React.Ref<HTMLDivElement>): React.ReactElement {
        return createElement('div', { key: this.key, ref }, []);
    }

    get activeProperties(): ViewProperty[] {
        return values(this.properties).filter((p) => !!p.value);
    }

    registerProperty(prop: ViewProperty): void {
        this.properties[prop.name] = prop;
    }

    property(name: string) {
        return this.properties[name];
    }

    instantiate(): this {
        const v = new (this.constructor as typeof View)();
        v.copyFrom(this);
        return v as this;
    }

    activePropertiesNamed(...names: string[]): ViewProperty[] {
        return names.map((n) => this.property(n)).filter((p) => !!p.value);
    }

    viewType(): string {
        return '';
    }

    toString(padding: number = 0): string {
        let r = `${' '.repeat(padding)}${this.viewType()} {\n`;
        for (let k in this.properties) {
            if (this.properties.hasOwnProperty(k) && this.properties[k].value) {
                r += `${this.properties[k].toString(padding + 4)}\n`;
            }
        }
        r += `${' '.repeat(padding)}}`;
        return r;
    }
}

export class Container extends View {
    private _views: View[] = [];

    constructor() {
        super();
        this.registerProperty(new ViewProperty('interactive', 'Bool'));
    }

    addManagedView(view: View): void {
        view.parent = this;
        this._views.push(view);
    }

    instantiate(): this {
        const v = new (this.constructor as typeof Container)();
        v.copyFrom(this);
        return v as this;
    }

    copyFrom(what: this): void {
        super.copyFrom(what);
        this._views = [];
        what._views.forEach((v) => this.addManagedView(v.instantiate()));
    }

    get views(): View[] {
        return this._views;
    }

    link(scope: Scope): void {
        super.link(scope);

        for (let v of this._views) {
            v.link(scope);
        }
    }

    getTargetWithRef(ref: React.Ref<HTMLDivElement>): React.ReactElement {
        return createElement(ReactContainer, {
            parentView: this,
            key: this.key,
            innerRef: ref,
        });
    }

    toString(padding: number = 0): string {
        let r = `${' '.repeat(padding)}${this.viewType()} {\n`;
        for (let k in this.properties) {
            if (this.properties.hasOwnProperty(k) && this.properties[k].value) {
                r += `${this.properties[k].toString(padding + 4)}\n`;
            }
        }

        for (let v of this._views) {
            r += v.toString(padding + 4) + '\n';
        }

        r += `${' '.repeat(padding)}}`;
        return r;
    }
}

export class AbsoluteLayout extends Container {
    constructor() {
        super();
        this.registerProperty(new ViewProperty('backgroundColor', 'Color'));
    }

    instantiate(): this {
        const v = new (this.constructor as typeof AbsoluteLayout)();
        v.copyFrom(this);
        return v as this;
    }

    viewType(): string {
        return 'absolute';
    }

    getTargetWithRef(ref: React.Ref<HTMLDivElement>): React.ReactElement {
        return createElement(ReactAbsoluteLayout, {
            parentView: this,
            key: this.key,
            innerRef: ref,
        });
    }
}

export enum LinearLayoutAxis {
    Horizontal,
    Vertical,
}

export class LinearLayout extends Container {
    readonly axis: LinearLayoutAxis;

    constructor(axis: LinearLayoutAxis) {
        super();
        this.axis = axis;
        this.registerProperty(new ViewProperty('spacing', 'Number'));
        this.registerProperty(new ViewProperty('alignment', 'LayoutAlignment'));
    }

    instantiate(): this {
        const v = new (this.constructor as typeof LinearLayout)(this.axis);
        v.copyFrom(this);
        return v as this;
    }

    get target(): React.ReactElement<
        any,
        string | React.JSXElementConstructor<any>
    > {
        if (this.axis === LinearLayoutAxis.Horizontal)
            return createElement(ReactHorizontalLayout, {
                parentView: this,
                key: this.key,
            });
        else
            return createElement(ReactVerticalLayout, {
                parentView: this,
                key: this.key,
            });
    }

    link(scope: Scope): void {
        if (!this.property('alignment').value) {
            this.property('alignment').value = new EnumValue('fill', 0, 0);
        }
        super.link(scope);
    }

    viewType(): string {
        return this.axis === LinearLayoutAxis.Horizontal
            ? 'horizontal'
            : 'vertical';
    }
}

export class StackLayout extends Container {
    constructor() {
        super();
        this.registerProperty(new ViewProperty('backgroundColor', 'Color'));
    }

    instantiate(): this {
        const v = new (this.constructor as typeof StackLayout)();
        v.copyFrom(this);
        return v as this;
    }

    viewType(): string {
        return 'stack';
    }

    get target(): React.ReactElement<
        any,
        string | React.JSXElementConstructor<any>
    > {
        return createElement(ReactStackLayout, {
            parentView: this,
            key: this.key,
        });
    }
}

export class LayoutView extends Container {
    constructor(readonly className?: string) {
        super();
    }

    viewType(): string {
        return 'layout';
    }

    getTargetWithRef(ref: React.Ref<HTMLDivElement>): React.ReactElement {
        return createElement(ReactTopLayout, {
            parentView: this,
            key: this.key,
            className: this.className,
            innerRef: ref,
        });
    }
}

export class Layer extends AbsoluteLayout {
    constructor() {
        super();
        this.registerProperty(new ViewProperty('z_order', 'Number'));
        this.registerProperty(new ViewProperty('fullscreen', 'Bool'));
    }

    instantiate(): this {
        const v = new (this.constructor as typeof Layer)();
        v.copyFrom(this);
        return v as this;
    }

    viewType(): string {
        return 'layer';
    }

    get target(): React.ReactElement<
        any,
        string | React.JSXElementConstructor<any>
    > {
        return createElement(ReactLayer, { parentView: this, key: this.key });
    }
}
