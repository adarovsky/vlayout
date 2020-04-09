import {ReactContainerState, ReactView, ReactViewProps, ReactViewState} from "./react_views";
import {List, ListItemPrototype, ListModelItem} from "./list";
import {ReactAbsoluteLayout} from "./react_absolute";
import _ from "lodash";
import React from "react";
import {Container, LinearLayoutAxis, StackLayout, ViewProperty} from "./view";
import {BehaviorSubject, Subscription} from "rxjs";
import {fromPromise} from "rxjs/internal-compatibility";
import {ListButton, ListTextField} from "./primitives";
import {ReactButtonBase, ReactButtonState} from "./react_button";
import {ViewListReference} from "./view_reference";
import {ReactTextFieldBase, ReactTextFieldState} from "./react_text";

//import FlipMove from "react-flip-move";

export interface ReactListState extends ReactViewState{
    childItems: ListItemPrototype[];
    spacing: number;
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

    render() {
        return (<div style={this.style()}
                     className={this.className}
                     ref={this.viewRef} onClick={e => this.handleClick(e)}>
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
        this.state = {...this.state, childItems: [], spacing: 0};
    }

    componentDidMount(): void {
        super.componentDidMount();
        const parentList = this.props.parentView as List;
        if (parentList.axis !== null) {
            this.wire('spacing', 'spacing', _.identity);
        }
        this.subscription.add(parentList.model!.sink.subscribe(arr => {
            const current = this.state.childItems;
            current.forEach(v => parentList.returnReusableItem(v));
            const newItems = arr.map( (m: any) => parentList.requestReusableItem(m));
            this.setState({childItems: newItems});
        }));
    }


    componentWillUnmount(): void {
        this.subviewSubscription.unsubscribe();
        super.componentWillUnmount();
    }

    componentDidUpdate(prevProps: Readonly<ReactViewProps>, prevState: Readonly<ReactListState>, snapshot?: any): void {
        const children = this.state.childItems
            .map(v => v.instance)
            .filter(v => v !== null) as ReactView<ReactViewProps, ReactViewState>[];
        if (!_.isEqual(this.children.value, children)) {
            this.children.next(children);
            this.updateSubviewPositions();
        }
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
                        if (isInStack) {
                            self.style.minWidth = '100%';
                        } else {
                            delete self.style.minWidth;
                        }
                    }

                    if (size.height > 0 && !this.isHeightDefined()) {
                        self.style.minHeight = size.height + 'px';
                    }
                    else {
                        if (isInStack) {
                            self.style.minHeight = '100%';
                        } else {
                            delete self.style.minHeight;
                        }
                    }
                }
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

export class ReactListTextField extends ReactTextFieldBase<ReactTextFieldState & {modelItem: ListModelItem|null}> {
    constructor(props: ReactViewProps) {
        super(props);

        this.state = {...this.state, modelItem: null};
    }

    componentDidMount(): void {
        super.componentDidMount();
        this.subscription.add((this.props.parentView as ListTextField).modelItem.subscribe(x => this.setState({modelItem: x})));
    }

    protected textEntered(e: string): void {
        const parent = this.props.parentView as ListTextField;
        if (this.state.modelItem !== null) {
            parent.onChange(this.state.modelItem, e);
        }
    }


    protected enterPressed(): void {
        const parent = this.props.parentView as ListTextField;
        if (this.state.modelItem !== null) {
            parent.onEnter(this.state.modelItem);
        }
    }
}

export class ReactViewListReference extends ReactView<ReactViewProps, ReactListState> {
    render() {
        const parent = this.props.parentView as ViewListReference;
        return parent.createComponent(parent, parent.modelItem);
    }
}
