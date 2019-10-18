import {ReactContainerState, ReactView, ReactViewProps, ReactViewState} from "./react_views";
import {List, ListItemPrototype} from "./list";
import {ReactAbsoluteLayout} from "./react_absolute";
import _ from "lodash";
import React from "react";
import {Container, LinearLayoutAxis, StackLayout, ViewProperty} from "./view";
import {BehaviorSubject, combineLatest, Observable, Subscription} from "rxjs";
import {ElementSize} from "./resize_sensor";
import {map, switchMap} from "rxjs/operators";
import {Dictionary} from "./types";
import {fromPromise} from "rxjs/internal-compatibility";
import {ListButton} from "./primitives";
import {ReactButtonBase} from "./react_button";

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
            return true
        return super.isWidthDefined();
    }

    protected isHeightDefined(): boolean {
        const parentList = this.props.parentView.parent as List;
        if (parentList.axis === LinearLayoutAxis.Horizontal)
            return true
        return super.isHeightDefined();
    }

    private handleClick(e: React.MouseEvent<HTMLDivElement, MouseEvent>): void {
        const self = this.props.parentView as ListItemPrototype;
        const tapCallback = (this.props.parentView.parent as List).tapCallback;
        if (tapCallback) {
            if (this.state.running) return;
            this.setState(s => ({...s, running: true}));
            e.preventDefault();
            e.stopPropagation();
            const promise = tapCallback(self.modelItem!);
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

export class ReactList extends ReactView<ReactViewProps, ReactListState> {
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

export class ReactHorizontalList extends ReactList {
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

    render(): React.ReactElement<any, string | React.JSXElementConstructor<any>> | string | number | {} | React.ReactNodeArray | React.ReactPortal | boolean | null | undefined {
        const extra = _.pick(this.state, 'id');
        return (<div style={this.style()} className={'vlayout_'+this.props.parentView.viewType()} ref={this.viewRef} {...extra}>
            <div style={{position: 'absolute', display: 'flex', flexDirection: 'row', height: '100%', justifyContent: 'unsafe start', alignItems: 'stretch'}}>
                {this.state.childItems.map(item => item.target)}
            </div>
        </div>);
    }
}

export class ReactVerticalList extends ReactList {

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

export class ReactListButton extends ReactButtonBase {
    protected handleClick(e: React.MouseEvent<HTMLDivElement, MouseEvent>): void {
        if (this.state.running) return;
        let proto : any | null  = this.props.parentView;
        while (proto &&  !(proto instanceof ListItemPrototype)) {
            proto = proto.parent;
        }

        if (proto !== null) {
            this.setState(s => Object.assign(s, {running: true}));
            e.preventDefault();
            e.stopPropagation();
            const promise = (this.props.parentView as ListButton).onClick(proto.modelItem);
            this.subscription.add(fromPromise(promise)
                .subscribe({
                    error: () => this.setState(s => ({...s, running: false})),
                    complete: () => this.setState(s => ({...s, running: false}))
                }));
        }
    }

}
