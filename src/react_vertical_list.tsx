import {ViewProperty} from "./view";
import React from "react";
import {combineLatest, Observable} from "rxjs";
import {ElementSize} from "./resize_sensor";
import {map, switchMap} from "rxjs/operators";
import {ReactList, ReactListState} from "./react_list";
import _ from "lodash";

export class ReactVerticalList extends ReactList<ReactListState> {

    styleValue(props: ViewProperty[], value: any[]): React.CSSProperties {
        const r = super.styleValue(props, value);
        r.pointerEvents = 'auto';
        if (!r.position) {
            r.position = 'relative';
        }
        r.overflowY = 'auto';

        return r;
    }

    intrinsicSize(): Observable<ElementSize> {
        return this.children.pipe(
            switchMap(children => combineLatest(children.map(c => c.intrinsicSize()))),
            map(sizes => {
                let maxHeight = 0;
                let maxWidth = 0;

                sizes.forEach((size) => {
                    maxHeight += maxHeight;
                    maxWidth = Math.max(maxWidth, size.width);
                });

                return {
                    width: maxWidth,
                    height: maxHeight
                };
            })
        );
    }

    render(): React.ReactElement<any, string | React.JSXElementConstructor<any>> | string | number | {} | React.ReactNodeArray | React.ReactPortal | boolean | null | undefined {
        const extra = _.pick(this.state, 'id');
        return (<div style={this.style()} className={this.className} ref={this.viewRef} {...extra}>
            {/*<FlipMove key={'flip'} duration={250} easing="ease-in-out" enterAnimation="fade" leaveAnimation="fade">*/}
            {this.state.childItems.flatMap( (v, index) => {
                const result = [v.target];
                if (index > 0 && this.state.spacing)
                    result.unshift(<div style={{height: this.state.spacing + 'px'}} key={`spacer-${index}`}/>);
                return result;
            })}
            {/*</FlipMove>*/}
        </div>);
    }

}
