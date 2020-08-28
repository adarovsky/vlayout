import { ViewProperty } from './view';
import React from 'react';
import { Observable } from 'rxjs';
import { ElementSize } from './resize_sensor';
import { map } from 'rxjs/operators';
import { ReactList, ReactListState } from './react_list';
import { pick } from 'lodash';
import { visibleChildrenSizes } from './react_absolute';

export class ReactVerticalList extends ReactList<ReactListState> {


    styleProperties(): ViewProperty[] {
        return super.styleProperties().concat(this.props.parentView.activePropertiesNamed('scrollable'));
    }

    styleValue(props: ViewProperty[], value: any[]): React.CSSProperties {
        const r = super.styleValue(props, value);
        r.pointerEvents = 'auto';
        if (!r.position) {
            r.position = 'relative';
        }

        const index = props.findIndex(p => p.name === 'scrollable');
        if (index < 0 || value[index]) {
            r.overflowY = 'auto';
        }
        else {
            r.overflowY = 'visible';
        }

        return r;
    }

    intrinsicSize(): Observable<ElementSize> {
        return this.children.pipe(
            visibleChildrenSizes(),
            map(sizes => {
                let maxHeight = 0;
                let maxWidth = 0;

                sizes.forEach((size) => {
                    maxHeight += size.height;
                    maxWidth = Math.max(maxWidth, size.width);
                });

                return {
                    width: maxWidth,
                    height: maxHeight + this.state.spacing * Math.max(sizes.length - 1, 0)
                };
            })
        );
    }

    render(): React.ReactElement | string | number | {} | React.ReactNodeArray | React.ReactPortal | boolean | null | undefined {
        const extra = pick(this.state, 'id');
        return (<div style={this.style()} className={this.className} ref={this.setViewRef} {...extra}>
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
