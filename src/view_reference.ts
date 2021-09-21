import { View, ViewProperty } from './view';
import React, {createElement} from "react";
import {ReactViewProps} from "./react_views";
import {ListItemPrototype, ListModelItem} from "./list";
import {ReactViewListReference} from "./react_list";
import {EMPTY, Observable} from "rxjs";
import {Scope} from "./layout";
import {LinkError} from "./errors";

export class ViewReference extends View {
    constructor(public readonly createComponent: (parent: ViewReference)
        => React.ReactElement<ReactViewProps> ) {
        super();
        this.registerProperty(new ViewProperty('interactive', 'Bool'));
    }

    instantiate(): this {
        const v = new (this.constructor as typeof ViewReference)(this.createComponent);
        v.copyFrom(this);
        return v as this;
    }

    get target(): React.ReactElement<any, string | React.JSXElementConstructor<any>> {
        return this.createComponent(this);
    }
}

export class ViewListReference extends View {
    modelItem: Observable<ListModelItem> = EMPTY;
    constructor(public readonly createComponent: (parent: View, modelItem: Observable<ListModelItem>) => React.ReactElement<ReactViewProps>) {
        super();
    }

    instantiate(): this {
        const v = new (this.constructor as typeof ViewListReference)(this.createComponent);
        v.copyFrom(this);
        return v as this;
    }

    link(scope: Scope): void {
        super.link(scope);
        if (scope instanceof ListItemPrototype) {
            this.modelItem = scope.modelItem;
        }
        else {
            throw new LinkError(this.line, this.column, `list view reference should be declared only in list item prorotype. Got ${scope} instead`);
        }
    }

    get target(): React.ReactElement<any, string | React.JSXElementConstructor<any>> {
        return createElement(ReactViewListReference, {parentView: this, key: this.key});
    }
}
