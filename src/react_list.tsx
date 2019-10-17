import {ReactView, ReactViewProps, ReactViewState} from "./react_views";
import {List, ListItemPrototype} from "./list";
import {ReactAbsoluteLayout} from "./react_absolute";
import _ from "lodash";
import React from "react";

export interface ReactListState extends ReactViewState{
    childItems: ListItemPrototype[];
}

export class ReactListItemPrototype extends ReactAbsoluteLayout {

}

export class ReactList extends ReactView<ReactViewProps, ReactListState> {
    constructor(props: ReactViewProps) {
        super(props);
        this.state = {...this.state, childItems: []};
    }

    componentDidMount(): void {
        super.componentDidMount();
        const parentList = this.props.parentView as List;
        this.subscription.add(parentList.model!.sink.subscribe(arr => {
            const current = this.state.childItems;
            current.forEach(v => parentList.returnReusableItem(v));
            const newItems = arr.map( (m: any) => parentList.requestReusableItem(m));
            this.setState({childItems: newItems});
        }));
    }

    render(): React.ReactElement<any, string | React.JSXElementConstructor<any>> | string | number | {} | React.ReactNodeArray | React.ReactPortal | boolean | null | undefined {
        const extra = _.pick(this.state, 'id');
        return (<div style={this.style()} className={'vlayout_'+this.props.parentView.viewType()} ref={this.viewRef} {...extra}>
            {this.state.childItems.map(item => item.target)}
        </div>);
    }
}

