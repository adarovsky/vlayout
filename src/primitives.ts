import {View, ViewProperty} from "./view";
import React, {createElement} from "react";
import {ReactGradient, ReactImage, ReactLabel, ReactProgress, ReactRoundRect} from "./react_primitives";
import {ReactButton} from "./react_button";
import {Scope} from "./layout";
import {EnumValue, Variable} from "./expression";
import {ListItemPrototype, ListModelItem, ListTextChangeHandler} from "./list";
import {ReactListButton, ReactListTextField} from "./react_list";
import {EMPTY, Observable} from "rxjs";
import {LinkError} from "./errors";
import {ReactTextField} from "./react_text";

export class Label extends View {
    constructor() {
        super();
        this.registerProperty(new ViewProperty('text', 'String'));
        this.registerProperty(new ViewProperty('textColor', 'Color'));
        this.registerProperty(new ViewProperty('font', 'Font'));
        this.registerProperty(new ViewProperty('backgroundColor', 'Color'));
        this.registerProperty(new ViewProperty('textAlignment', 'TextAlignment'));
        this.registerProperty(new ViewProperty('maxLines', 'Number'));
    }
    viewType(): string {
        return 'label';
    }

    link(scope: Scope): void {
        if (!this.property('textAlignment').value) {
            this.property('textAlignment').value = new EnumValue('left', 0, 0);
        }
        super.link(scope);
    }

    get target(): React.ReactElement {
        return createElement(ReactLabel, {parentView: this, key: this.key});
    }
}

export class ImageView extends View {
    constructor() {
        super();
        this.registerProperty(new ViewProperty('image', 'Image'));
        // this.registerProperty(new ViewProperty('baseline', 'Number'));
        this.registerProperty(new ViewProperty('contentPolicy', 'ContentPolicy'));
    }
    viewType(): string {
        return 'image';
    }
    get target(): React.ReactElement {
        return createElement(ReactImage, {parentView: this, key: this.key});
    }
}

export class Gradient extends View {
    constructor() {
        super();
        this.registerProperty(new ViewProperty('startColor', 'Color'));
        this.registerProperty(new ViewProperty('endColor', 'Color'));
        this.registerProperty(new ViewProperty('orientation', 'GradientOrientation'));
    }
    viewType(): string {
        return 'gradient';
    }

    get target(): React.ReactElement {
        return createElement(ReactGradient, {parentView: this, key: this.key});
    }
}

export class RoundRect extends View {
    constructor() {
        super();
        this.registerProperty(new ViewProperty('strokeColor', 'Color'));
        this.registerProperty(new ViewProperty('strokeWidth', 'Number'));
        this.registerProperty(new ViewProperty('cornerRadius', 'Number'));
        this.registerProperty(new ViewProperty('backgroundColor', 'Color'));
    }
    viewType(): string {
        return 'roundRect';
    }
    get target(): React.ReactElement {
        return createElement(ReactRoundRect, {parentView: this, key: this.key});
    }
}

export class Progress extends View {
    constructor() {
        super();
        this.registerProperty(new ViewProperty('color', 'Color'));
    }
    viewType(): string {
        return 'progress';
    }

    get target(): React.ReactElement {
        return createElement(ReactProgress, {parentView: this, key: this.key});
    }
}

export class ButtonBase extends RoundRect {
    constructor() {
        super();
        this.registerProperty(new ViewProperty('enabled', 'Bool'));
        this.registerProperty(new ViewProperty('text', 'String'));
        this.registerProperty(new ViewProperty('textColor', 'Color'));
        this.registerProperty(new ViewProperty('image', 'Image'));
        this.registerProperty(new ViewProperty('imagePadding', 'Number'));
        this.registerProperty(new ViewProperty('imagePosition', 'ImagePosition'));
        this.registerProperty(new ViewProperty('font', 'Font'));
        ['left', 'right', 'top', 'bottom'].forEach( t => {
            this.registerProperty(new ViewProperty('contentPadding.' + t, 'Number'));
        });
    }

    link(scope: Scope): void {
        if (!this.property('imagePosition').value) {
            this.property('imagePosition').value = new EnumValue('leftToText', 0, 0);
        }
        super.link(scope);
    }

    viewType(): string {
        return 'button';
    }
}

export class Button extends ButtonBase {

    constructor(public readonly onClick: () => Promise<void>) {
        super();
    }

    instantiate(): this {
        const v = new (this.constructor as typeof Button)(this.onClick);
        v.copyFrom(this);
        return v as this;
    }

    get target(): React.ReactElement {
        return createElement(ReactButton, {parentView: this, key: this.key});
    }
}

export class ListButton extends ButtonBase {
    modelItem: Observable<ListModelItem> = EMPTY;
    constructor(public readonly onClick: (i: ListModelItem) => Promise<void>) {
        super();
    }

    instantiate(): this {
        const v = new (this.constructor as typeof ListButton)(this.onClick);
        v.copyFrom(this);
        return v as this;
    }

    link(scope: Scope): void {
        super.link(scope);

        if (scope instanceof ListItemPrototype) {
            this.modelItem = scope.modelItem;
        }
        else {
            throw new LinkError(this.line, this.column, `list button should be declared only in list item prototype. Got ${scope} instead`);
        }
    }

    get target(): React.ReactElement {
        return createElement(ReactListButton, {parentView: this, key: this.key});
    }
}

export class TextFieldBase extends RoundRect {
    constructor(public name: string) {
        super();
        this.registerProperty(new ViewProperty('enabled', 'Bool'));
        this.registerProperty(new ViewProperty('text', 'String'));
        this.registerProperty(new ViewProperty('placeholder', 'String'));
        this.registerProperty(new ViewProperty('textColor', 'Color'));
        this.registerProperty(new ViewProperty('font', 'Font'));
        ['left', 'right', 'top', 'bottom'].forEach( t => {
            this.registerProperty(new ViewProperty('contentPadding.' + t, 'Number'));
        });
    }

    viewType(): string {
        return 'textField';
    }
}

export class TextField extends TextFieldBase {

    constructor(name: string, public readonly onChange: (s: string) => void) {
        super(name);
    }

    instantiate(): this {
        const v = new (this.constructor as typeof TextField)(this.name, this.onChange);
        v.copyFrom(this);
        return v as this;
    }

    link(scope: Scope): void {
        this.property('text').value = new Variable(this.name, 0, 0);
        super.link(scope);
    }

    get target(): React.ReactElement {
        return createElement(ReactTextField, {parentView: this, key: this.key});
    }
}

export class ListTextField extends TextFieldBase {
    modelItem: Observable<ListModelItem> = EMPTY;
    constructor(name: string, public readonly onChange: ListTextChangeHandler) {
        super(name);
    }

    instantiate(): this {
        const v = new (this.constructor as typeof ListTextField)(this.name, this.onChange);
        v.copyFrom(this);
        return v as this;
    }

    link(scope: Scope): void {
        super.link(scope);

        if (scope instanceof ListItemPrototype) {
            this.modelItem = scope.modelItem;
        }
        else {
            throw new LinkError(this.line, this.column, `list text field should be declared only in list item prototype. Got ${scope} instead`);
        }
    }

    get target(): React.ReactElement {
        return createElement(ReactListTextField, {parentView: this, key: this.key});
    }
}