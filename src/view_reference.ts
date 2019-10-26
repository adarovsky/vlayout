import {View} from "./view";
import React, {createElement, CSSProperties} from "react";
import {ReactViewProps} from "./react_views";
import {ListModelItem} from "./list";
import {ReactViewListReference} from "./react_list";
import {EMPTY, Observable} from "rxjs";

export class ViewReference extends View {
    constructor(public readonly createComponent: (parent: ViewReference)
        => React.ReactElement<ReactViewProps> ) {
        super();
    }

    get target(): React.ReactElement<any, string | React.JSXElementConstructor<any>> {
        return this.createComponent(this);
    }
}

export class ViewListReference extends View {
    modelItem: Observable<ListModelItem> = EMPTY;
    constructor(public readonly createComponent: (style: CSSProperties, modelItem: ListModelItem)
        => React.ReactElement<ReactViewProps> ) {
        super();
    }

    get target(): React.ReactElement<any, string | React.JSXElementConstructor<any>> {
        return createElement(ReactViewListReference, {parentView: this, modelItem: this.modelItem});
    }
}
