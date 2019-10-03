import {View} from "./view";
import React, {JSXElementConstructor} from "react";
import {ReactView, ReactViewProps, ReactViewState} from "./react_views";

export class ViewReference extends View {
    constructor(public readonly createComponent: (parent: ViewReference)
        => React.ReactElement<ReactViewProps> ) {
        super();
    }

    get target(): React.ReactElement<any, string | React.JSXElementConstructor<any>> {
        return this.createComponent(this);
    }
}
