import React, { CSSProperties } from 'react';
import { ReactView, ReactViewProps, ReactViewState } from './react_views';
import { ViewProperty } from './view';
import { combineLatest, Observable } from 'rxjs';
import { ElementSize, resizeObserver } from './resize_sensor';
import { distinctUntilChanged, map, switchMap } from 'rxjs/operators';
import { ReactList, ReactListState } from './react_list';
import { isEqual, pick } from 'lodash';
import { visibleChildrenSizes } from './react_absolute';
import composeRefs from '@seznam/compose-react-refs';

interface ReactHorizontalListState extends ReactListState {
    scrollerStyle: CSSProperties;
}

export class ReactHorizontalList extends ReactList<ReactHorizontalListState> {
    readonly scrollerRef = React.createRef<HTMLDivElement>();

    constructor(props: ReactViewProps) {
        super(props);
        this.state = { ...this.state, scrollerStyle: {} };
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
            map((sizes) => {
                let maxHeight = 0;
                let maxWidth = 0;

                sizes.forEach((size) => {
                    maxHeight = Math.max(maxHeight, size.height);
                    maxWidth += size.width;
                });

                return {
                    width:
                        maxWidth +
                        this.state.spacing * Math.max(sizes.length - 1, 0),
                    height: maxHeight,
                };
            })
        );
    }

    definesChildHeight(
        child: ReactView<ReactViewProps, ReactViewState>
    ): boolean {
        return this.isHeightDefined();
    }

    isHorizontallyScrollable(): boolean {
        return true;
    }

    componentDidMount(): void {
        super.componentDidMount();
        const align = this.props.parentView.property('alignment');
        const currentSize = this.viewRef.pipe(
            switchMap((self) => resizeObserver(self))
        );

        if (align && align.value && this.scrollerRef.current) {
            this.subscription.add(
                combineLatest([
                    align.value.sink,
                    currentSize,
                    resizeObserver(this.scrollerRef.current),
                ])
                    .pipe(distinctUntilChanged((x, y) => isEqual(x, y)))
                    .subscribe(([align, containerSize, scrollerSize]) => {
                        if (containerSize.width > scrollerSize.width) {
                            switch (align) {
                                case 'center':
                                    this.setState({
                                        scrollerStyle: {
                                            left: '50%',
                                            transform: 'translateX(-50%)',
                                        },
                                    });
                                    break;
                                case 'trailing':
                                    this.setState({
                                        scrollerStyle: { right: 0 },
                                    });
                                    break;
                                default:
                                    this.setState({ scrollerStyle: {} });
                            }
                        } else {
                            this.setState({ scrollerStyle: {} });
                        }
                    })
            );
        }
    }

    render() {
        const extra = pick(this.state, 'id');
        return (
            <div
                style={this.style()}
                className={this.className}
                ref={composeRefs(this.setViewRef, this.props.innerRef)}
                {...extra}
            >
                <div
                    style={{
                        ...this.state.scrollerStyle,
                        position: 'absolute',
                        display: 'flex',
                        flexDirection: 'row',
                        height: '100%',
                        justifyContent: 'unsafe start',
                        alignItems: 'stretch',
                    }}
                    ref={this.scrollerRef}
                >
                    {this.state.childItems.flatMap((v, index) => {
                        const result = [v.target];
                        if (index > 0 && this.state.spacing)
                            result.unshift(
                                <div
                                    style={{ width: this.state.spacing + 'px' }}
                                    key={index}
                                />
                            );
                        return result;
                    })}
                </div>
            </div>
        );
    }
}
