import {ReactView, ReactViewProps, ReactViewState} from "./react_views";
import {List, ListItemPrototype} from "./list";
import {ReactAbsoluteLayout} from "./react_absolute";
import _ from "lodash";
import React from "react";
import {LinearLayoutAxis, ViewProperty} from "./view";

export interface ReactListState extends ReactViewState{
    childItems: ListItemPrototype[];
}

export class ReactListItemPrototype extends ReactAbsoluteLayout {
    styleValue(props: ViewProperty[], value: any[]): React.CSSProperties {
        const parentList = this.props.parentView.parent as List;
        const r = super.styleValue(props, value);
        if (parentList.axis === LinearLayoutAxis.Vertical) {
            r.minWidth = '100%';
        }
        else {
            r.minHeight = '100%';
        }

        return r;
    }
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


    styleValue(props: ViewProperty[], value: any[]): React.CSSProperties {
        const r = super.styleValue(props, value);
        const parentList = this.props.parentView as List;
        if (parentList.axis === LinearLayoutAxis.Horizontal) {
            r.overflowX = 'scroll';
        }
        else {
            r.overflowY = 'scroll';
        }
        return r;
    }

    render(): React.ReactElement<any, string | React.JSXElementConstructor<any>> | string | number | {} | React.ReactNodeArray | React.ReactPortal | boolean | null | undefined {
        const extra = _.pick(this.state, 'id');
        return (<div style={this.style()} className={'vlayout_'+this.props.parentView.viewType()} ref={this.viewRef} {...extra}>
            {this.state.childItems.map(item => item.target)}
        </div>);
    }
}

