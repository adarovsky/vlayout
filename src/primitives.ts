import {View, ViewProperty} from "./view";
import React, {createElement} from "react";
import {ReactGradient, ReactImage, ReactLabel, ReactProgress, ReactRoundRect} from "./react_primitives";
import {ReactButton} from "./react_button";
import {Scope} from "./layout";
import {EnumValue} from "./expression";

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

export class Button extends RoundRect {
    constructor(public readonly onClick: () => Promise<void>) {
        super();
        this.interactive = true;
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
    get target(): React.ReactElement {
        return createElement(ReactButton, {parentView: this, key: this.key});
    }
}
