import {View} from "./view";
import React, {JSXElementConstructor} from "react";
import {ReactView, ReactViewState} from "./react_views";

export class ViewReference extends View {
    constructor(public readonly createComponent: <P extends ReactViewState>(parent: ViewReference)
        => React.ReactElement<ReactView<P>, JSXElementConstructor<P>> ) {
        super();
    }

    get target(): React.ReactElement<any, string | React.JSXElementConstructor<any>> {
        return this.createComponent(this);
    }
}
