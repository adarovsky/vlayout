import { ViewProperty } from './view';
import React from 'react';
import { Observable } from 'rxjs';
import { ElementSize } from './resize_sensor';
import { ReactList, ReactListState } from './react_list';
import { absoluteIntrinsicSize } from './react_absolute';
import { pick } from 'lodash';
import { ReactView, ReactViewProps, ReactViewState } from './react_views';
import { isNotNull } from './utils';

export class ReactAbsoluteList extends ReactList<ReactListState> {

    styleValue(props: ViewProperty[], value: any[]): React.CSSProperties {
        const r = super.styleValue(props, value);
        if (!r.position)
            r.position = 'relative';
        return r;
    }

    intrinsicSize(): Observable<ElementSize> {
        return this.children.pipe(absoluteIntrinsicSize());
    }

    definesChildWidth(
        child: ReactView<ReactViewProps, ReactViewState>,
    ): boolean {
        return this.isWidthDefined() &&
            (isNotNull(child.state.size?.width) || (isNotNull(child.state.padding?.left) && isNotNull(child.state.padding?.right)));
    }

    definesChildHeight(
        child: ReactView<ReactViewProps, ReactViewState>,
    ): boolean {
        return this.isHeightDefined() &&
            (isNotNull(child.state.size?.height) || (isNotNull(child.state.padding?.top) && isNotNull(child.state.padding?.bottom)));
    }

    render() {
        const extra = pick(this.state, 'id');
        return (<div style={this.style()} className={this.className} ref={this.setViewRef} {...extra}>
            {this.state.childItems.map( v => v.target )}
        </div>);
    }

}
