import { AbsoluteLayout, ViewProperty } from './view';
import React, { createElement } from 'react';
import { ReactAbsoluteLayout } from './react_absolute';
import { ReactTooltip } from './react_tooltip';

export class Tooltip extends AbsoluteLayout {
    constructor() {
        super();
        this.registerProperty(new ViewProperty('theme', 'String'));
        this.registerProperty(new ViewProperty('placement', 'TooltipPlacement'));
    }

    instantiate(): this {
        const v = new (this.constructor as typeof Tooltip)();
        v.copyFrom(this);
        return v as this;
    }

    getTargetWithRef(ref: React.Ref<HTMLDivElement>): React.ReactElement {
        return createElement(ReactTooltip, {
            parentView: this,
            key: this.key, innerRef: ref
        });
    }
}
