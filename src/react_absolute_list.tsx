import { ViewProperty } from './view';
import React from 'react';
import { Observable } from 'rxjs';
import { ElementSize } from './resize_sensor';
import { ReactList, ReactListState } from './react_list';
import { absoluteIntrinsicSize } from './react_absolute';
import { pick } from 'lodash';
import { ReactView, ReactViewProps, ReactViewState } from './react_views';
import { isNotNull } from './utils';
import composeRefs from '@seznam/compose-react-refs';

export class ReactAbsoluteList extends ReactList<ReactListState> {

    styleValue(props: ViewProperty[], value: any[]): React.CSSProperties {
        const r = super.styleValue(props, value);

        let i = props.findIndex((p) => p.name === 'interactive');
        const interactive = i >= 0 && value[i];

        i = props.findIndex((p) => p.name === 'scrollable');
        const scrollable = i >= 0 && value[i];

        r.pointerEvents = interactive || scrollable ? 'auto' : 'none';
        if (!r.position) {
            r.position = 'relative';
        }
        r.overflow = scrollable ? 'auto' : 'hidden';
        return r;
    }

    intrinsicSize(): Observable<ElementSize> {
        return this.children.pipe(absoluteIntrinsicSize());
    }

    definesChildWidth(
        child: ReactView<ReactViewProps, ReactViewState>
    ): boolean {
        return (
            this.isWidthDefined() &&
            (isNotNull(child.state.size?.width) ||
                (isNotNull(child.state.padding?.left) &&
                    isNotNull(child.state.padding?.right)))
        );
    }

    definesChildHeight(
        child: ReactView<ReactViewProps, ReactViewState>
    ): boolean {
        return (
            this.isHeightDefined() &&
            (isNotNull(child.state.size?.height) ||
                (isNotNull(child.state.padding?.top) &&
                    isNotNull(child.state.padding?.bottom)))
        );
    }

    render() {
        const extra = pick(this.state, 'id');
        return (<div style={this.style()} className={this.className} ref={composeRefs(this.setViewRef, this.props.innerRef)} {...extra}>
            {this.state.childItems.map( v => v.target )}
        </div>);
    }

}
