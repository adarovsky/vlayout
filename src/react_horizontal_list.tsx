import React, { CSSProperties } from 'react';
import { ReactViewProps } from './react_views';
import { ViewProperty } from './view';
import { combineLatest, Observable } from 'rxjs';
import { ElementSize, resizeObserver } from './resize_sensor';
import { map, switchMap } from 'rxjs/operators';
import { ReactList, ReactListState } from './react_list';
import { pick } from 'lodash';
import { visibleChildrenSizes } from './react_absolute';

interface ReactHorizontalListState extends ReactListState {
    scrollerStyle: CSSProperties;
}

export class ReactHorizontalList extends ReactList<ReactHorizontalListState> {
    readonly scrollerRef = React.createRef<HTMLDivElement>();

    constructor(props: ReactViewProps) {
        super(props);
        this.state = {...this.state, scrollerStyle: {}};
    }

    styleValue(props: ViewProperty[], value: any[]): React.CSSProperties {
        const r = super.styleValue(props, value);
        r.pointerEvents = 'auto';
        if (!r.position) {
            r.position = 'relative';
        }
        r.overflowX = 'auto';
        return r;
    }

    intrinsicSize(): Observable<ElementSize> {
        return this.children.pipe(
            visibleChildrenSizes(),
            map(sizes => {
                let maxHeight = 0;
                let maxWidth = 0;

                sizes.forEach((size) => {
                    maxHeight = Math.max(maxHeight, size.height);
                    maxWidth += size.width;
                });

                return {
                    width: maxWidth + this.state.spacing * Math.max(sizes.length - 1, 0),
                    height: maxHeight
                };
            })
        );
    }

    componentDidMount(): void {
        super.componentDidMount();
        const align = this.props.parentView.property('alignment');
        const currentSize = this.viewRef.pipe(switchMap(self => resizeObserver(self)));

        if (align && align.value && this.scrollerRef.current) {
            this.subscription.add(combineLatest([align.value.sink, currentSize, resizeObserver(this.scrollerRef.current)])
                .subscribe(([align, containerSize, scrollerSize]) => {
                    if (containerSize.width > scrollerSize.width) {
                        switch (align) {
                            case 'center':
                                this.setState({scrollerStyle: {left: '50%', transform: 'translateX(-50%)'}});
                                break;
                            case 'trailing':
                                this.setState({scrollerStyle: {right: 0}});
                                break;
                            default:
                                this.setState({scrollerStyle: {}});
                        }
                    } else {
                        this.setState({scrollerStyle: {}});
                    }
                }));
        }
    }

    render(): React.ReactElement<any, string | React.JSXElementConstructor<any>> | string | number | {} | React.ReactNodeArray | React.ReactPortal | boolean | null | undefined {
        const extra = pick(this.state, 'id');
        return (<div style={this.style()} className={this.className} ref={this.setViewRef} {...extra}>
            <div style={{
                ...this.state.scrollerStyle,
                position: 'absolute',
                display: 'flex',
                flexDirection: 'row',
                height: '100%',
                justifyContent: 'unsafe start',
                alignItems: 'stretch'
            }}
                 ref={this.scrollerRef}>
                {this.state.childItems.flatMap((v, index) => {
                    const result = [v.target];
                    if (index > 0 && this.state.spacing)
                        result.unshift(<div style={{width: this.state.spacing + 'px'}} key={index}/>);
                    return result;
                })}
            </div>
        </div>);
    }
}
