import { ViewProperty } from './view';
import React from 'react';
import { Observable } from 'rxjs';
import { ElementSize } from './resize_sensor';
import { ReactList, ReactListState } from './react_list';
import { absoluteIntrinsicSize } from './react_absolute';
import { pick } from 'lodash';

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

    // render() {
    //     const extra = pick(this.state, 'id');
    //     return (<div style={this.style()} className={this.className} ref={this.updateRef} {...extra}>
    //             {this.state.childItems.map(v => v.target)});
    //                 return result;
    //             })}
    //     </div>);
    // }

    render() {
        const extra = pick(this.state, 'id');
        return (<div style={this.style()} className={this.className} ref={this.setViewRef} {...extra}>
            {this.state.childItems.map( v => v.target )}
        </div>);
    }

}
