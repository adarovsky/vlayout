import {View} from "./view";
import React, {JSXElementConstructor} from "react";
import {ReactView, ReactViewProps, ReactViewState} from "./react_views";

export class ViewReference extends View {
    constructor(public readonly createComponent: <P extends ReactViewProps, S extends ReactViewState>(parent: ViewReference)
        => React.ReactElement<ReactView<P, S>, JSXElementConstructor<P>> ) {
        super();
    }

    get target(): React.ReactElement<any, string | React.JSXElementConstructor<any>> {
        return this.createComponent(this);
    }
}
