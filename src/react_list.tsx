import {ReactContainerState, ReactView, ReactViewProps, ReactViewState} from "./react_views";
import {List, ListItemPrototype, ListModelItem} from "./list";
import {ReactAbsoluteLayout} from "./react_absolute";
import _ from "lodash";
import React, {CSSProperties} from "react";
import {Container, LinearLayoutAxis, StackLayout, ViewProperty} from "./view";
import {BehaviorSubject, combineLatest, Observable, Subscription} from "rxjs";
import {ElementSize, resizeObserver} from "./resize_sensor";
import {map, switchMap} from "rxjs/operators";
import {Dictionary} from "./types";
import {fromPromise} from "rxjs/internal-compatibility";
import {ListButton} from "./primitives";
import {ReactButtonBase, ReactButtonState} from "./react_button";
import {ViewListReference} from "./view_reference";

export interface ReactListState extends ReactViewState{
    childItems: ListItemPrototype[];
}

export interface ReactListItemState extends ReactContainerState {
    running: boolean;
}

export class ReactListItemPrototype extends ReactAbsoluteLayout<ReactListItemState> {

    constructor(props: ReactViewProps) {
        super(props);
        this.state = {...this.state, running: false};
    }

    styleValue(props: ViewProperty[], value: any[]): React.CSSProperties {
        const parentList = this.props.parentView.parent as List;
        const r = super.styleValue(props, value);
        if (parentList.axis === LinearLayoutAxis.Vertical) {
            r.minWidth = '100%';
        }
        if (parentList.tapCallback) {
            r.pointerEvents = 'auto';
        }

        return r;
    }

    style(): React.CSSProperties {
        const r = {...super.style()};
        const parentList = this.props.parentView.parent as List;
        if (parentList.tapCallback) {
            r.cursor = this.state.running ? 'progress' : 'pointer';
        }
        return r;
    }

    protected isWidthDefined(): boolean {
        const parentList = this.props.parentView.parent as List;
        if (parentList.axis === LinearLayoutAxis.Vertical)
            return true;
        return super.isWidthDefined();
    }

    protected isHeightDefined(): boolean {
        const parentList = this.props.parentView.parent as List;
        if (parentList.axis === LinearLayoutAxis.Horizontal)
            return true;
        return super.isHeightDefined();
    }

    private handleClick(e: React.MouseEvent<HTMLDivElement, MouseEvent>): void {
        const self = this.props.parentView as ListItemPrototype;
        const tapCallback = (this.props.parentView.parent as List).tapCallback;
        if (tapCallback) {
            if (this.state.running || self.modelItemSnapshot === null) return;
            this.setState(s => ({...s, running: true}));
            e.preventDefault();
            e.stopPropagation();
            const promise = tapCallback(self.modelItemSnapshot);
            this.subscription.add(fromPromise(promise)
                .subscribe({
                    error: () => this.setState(s => ({...s, running: false})),
                    complete: () => this.setState(s => ({...s, running: false}))
                }));
        }
    }

    render(): React.ReactElement<any, string | React.JSXElementConstructor<any>> | string | number | {} | React.ReactNodeArray | React.ReactPortal | boolean | null | undefined {
        // @ts-ignore
        const extra: Dictionary<any> = _.pick(this.state, 'id');
        return (<div style={this.style()} className={'vlayout_'+this.props.parentView.viewType()} ref={this.viewRef} onClick={e => this.handleClick(e)} {...extra}>
            {(this.props.parentView as Container).views
                .filter((v, index) => this.state.childrenVisible[index])
                .map( v => v.target )}
        </div>);
    }

}

export class ReactList<S extends ReactListState> extends ReactView<ReactViewProps, S> {
    protected children = new BehaviorSubject<ReactView<ReactViewProps, ReactViewState>[]>([]);
    protected subviewSubscription: Subscription = new Subscription();

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

    componentDidUpdate(prevProps: Readonly<ReactViewProps>, prevState: Readonly<ReactListState>, snapshot?: any): void {
        const children = this.state.childItems
            .map(v => v.instance)
            .filter(v => v !== null) as ReactView<ReactViewProps, ReactViewState>[];
        this.children.next(children);
        this.updateSubviewPositions();
    }

    protected updateSubviewPositions(): void {
        const self = this.viewRef.current;
        if (!self) return;

        this.subviewSubscription.unsubscribe();
        const isInStack = this.props.parentView.parent instanceof StackLayout;
        this.subviewSubscription = this.intrinsicSize()
            .subscribe(size => {
                    if (size.width > 0 && !this.isWidthDefined()) {
                        self.style.minWidth = size.width + 'px';
                    }
                    else {
                        self.style.minWidth = isInStack ? '100%' : null;
                    }

                    if (size.height > 0 && !this.isHeightDefined()) {
                        self.style.minHeight = size.height + 'px';
                    }
                    else {
                        self.style.minHeight = isInStack ? '100%' : null;
                    }
                }
            );
    }


    styleValue(props: ViewProperty[], value: any[]): React.CSSProperties {
        const r = super.styleValue(props, value);
        r.pointerEvents = 'auto';
        return r;
    }

    render(): React.ReactElement<any, string | React.JSXElementConstructor<any>> | string | number | {} | React.ReactNodeArray | React.ReactPortal | boolean | null | undefined {
        const extra = _.pick(this.state, 'id');
        return (<div style={this.style()} className={'vlayout_'+this.props.parentView.viewType()} ref={this.viewRef} {...extra}>
            {this.state.childItems.map(item => item.target)}
        </div>);
    }
}

interface ReactHorizontalListState extends ReactListState  {
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
        r.overflowX = 'scroll';
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
                    }
                    else {
                        this.setState({scrollerStyle: {}});
                    }
                }));
        }
    }

    render(): React.ReactElement<any, string | React.JSXElementConstructor<any>> | string | number | {} | React.ReactNodeArray | React.ReactPortal | boolean | null | undefined {
        const extra = _.pick(this.state, 'id');
        return (<div style={this.style()} className={'vlayout_'+this.props.parentView.viewType()} ref={this.viewRef} {...extra}>
            <div style={{...this.state.scrollerStyle,
                position: 'absolute',
                display: 'flex',
                flexDirection: 'row',
                height: '100%',
                justifyContent: 'unsafe start',
                alignItems: 'stretch'
            }}
                 ref={this.scrollerRef}>
                {this.state.childItems.map(item => item.target)}
            </div>
        </div>);
    }
}

export class ReactVerticalList extends ReactList<ReactListState> {

    styleValue(props: ViewProperty[], value: any[]): React.CSSProperties {
        const r = super.styleValue(props, value);
        r.overflowY = 'scroll';

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
}

export class ReactListButton extends ReactButtonBase<ReactButtonState & {modelItem: ListModelItem|null}> {
    constructor(props: ReactViewProps) {
        super(props);

        this.state = {...this.state, modelItem: null};
    }

    componentDidMount(): void {
        super.componentDidMount();
        this.subscription.add((this.props.parentView as ListButton).modelItem.subscribe(x => this.setState({modelItem: x})));
    }

    protected handleClick(e: React.MouseEvent<HTMLDivElement, MouseEvent>): void {
        if (this.state.running) return;
        const parent = this.props.parentView as ListButton;
        if (this.state.modelItem !== null) {
            this.setState(s => Object.assign(s, {running: true}));
            e.preventDefault();
            e.stopPropagation();
            const promise = parent.onClick(this.state.modelItem);
            this.subscription.add(fromPromise(promise)
                .subscribe({
                    error: () => this.setState(s => ({...s, running: false})),
                    complete: () => this.setState(s => ({...s, running: false}))
                }));
        }
    }

}

export class ReactViewListReference extends ReactView<ReactViewProps & {modelItem: Observable<ListModelItem>}, ReactListState> {
    render() {
        const parent = this.props.parentView as ViewListReference;
        return parent.createComponent(parent, this.props.modelItem);
    }
}