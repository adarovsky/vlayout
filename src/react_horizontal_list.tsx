import React, {CSSProperties} from "react";
import {ReactViewProps} from "./react_views";
import {ViewProperty} from "./view";
import {combineLatest, Observable} from "rxjs";
import {ElementSize, resizeObserver} from "./resize_sensor";
import {map, switchMap} from "rxjs/operators";
import _ from "lodash";
import {ReactList, ReactListState} from "./react_list";

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
            switchMap(children => combineLatest(children.map(c => c.intrinsicSize()))),
            map(sizes => {
                let maxHeight = 0;
                let maxWidth = 0;

                sizes.forEach((size) => {
                    maxHeight = Math.max(maxHeight, size.height);
                    maxWidth += size.width;
                });

                return {
                    width: maxWidth,
                    height: maxHeight
                };
            })
        );
    }

    componentDidMount(): void {
        super.componentDidMount();
        const align = this.props.parentView.property('alignment');
        if (align && align.value && this.viewRef.current && this.scrollerRef.current) {
            this.subscription.add(combineLatest([align.value.sink, resizeObserver(this.viewRef.current), resizeObserver(this.scrollerRef.current)])
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
        const extra = _.pick(this.state, 'id');
        return (<div style={this.style()} className={this.className} ref={this.viewRef} {...extra}>
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
