import {
    ReactContainerState,
    ReactView,
    ReactViewProps,
    ReactViewState,
} from './react_views';
import { List, ListItemPrototype, ListModelItem, modelItemsEqual, prototypeMatch } from './list';
import { ReactAbsoluteLayout } from './react_absolute';
import React from 'react';
import { Container, LinearLayoutAxis, ViewProperty } from './view';
import { BehaviorSubject, from, Subscription } from 'rxjs';
import { ListButton, ListTextField } from './primitives';
import { ReactButtonBase, ReactButtonState } from './react_button';
import { ViewListReference } from './view_reference';
import { ReactTextFieldBase, ReactTextFieldState } from './react_text';
import { ColorContainer, Dictionary } from './types';
import {
    identity,
    isEqual,
    isEqualWith,
    isPlainObject,
    partition,
    toPairs,
} from 'lodash';
import { distinctUntilChanged, tap } from 'rxjs/operators';

//import FlipMove from "react-flip-move";

export interface ReactListState extends ReactViewState {
    childItems: ListItemPrototype[];
    spacing: number;
}

export interface ReactListItemState extends ReactContainerState {
    running: boolean;
    snapshot?: ListModelItem;
}

export class ReactListItemPrototype extends ReactAbsoluteLayout<
    ReactListItemState
> {
    constructor(props: ReactViewProps) {
        super(props);
        this.state = { ...this.state, running: false };
    }

    componentDidMount(): void {
        super.componentDidMount();
        const self = this.props.parentView as ListItemPrototype;
        this.subscription.add(
            self.modelItem.subscribe(s => this.setState({ snapshot: s }))
        );
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
        const r = { ...super.style() };
        const parentList = this.props.parentView.parent as List;
        if (parentList.tapCallback) {
            r.cursor = this.state.running ? 'progress' : 'pointer';
        }
        return r;
    }

    render() {
        return (
            <div
                style={this.style()}
                className={this.className}
                ref={this.setViewRef}
                onClick={e => this.handleClick(e)}
            >
                {(this.props.parentView as Container).views
                    .filter((v, index) => this.state.childrenVisible[index])
                    .map(v => v.target)}
            </div>
        );
    }

    protected isWidthDefined(): boolean {
        const parentList = this.props.parentView.parent as List;
        if (parentList.axis === LinearLayoutAxis.Vertical) return true;
        return super.isWidthDefined();
    }

    protected isHeightDefined(): boolean {
        const parentList = this.props.parentView.parent as List;
        if (parentList.axis === LinearLayoutAxis.Horizontal) return true;
        return super.isHeightDefined();
    }

    private handleClick(e: React.MouseEvent<HTMLDivElement, MouseEvent>): void {
        const self = this.props.parentView as ListItemPrototype;
        const tapCallback = (this.props.parentView.parent as List).tapCallback;
        if (tapCallback) {
            if (this.state.running || self.modelItemSnapshot === null) return;
            this.logValue('running', true);
            this.setState(s => ({ ...s, running: true }));
            e.preventDefault();
            e.stopPropagation();
            const promise = tapCallback(self.modelItemSnapshot);
            this.subscription.add(
                from(promise).subscribe({
                    error: () => {
                        this.logValue('running', false);
                        this.setState((s) => ({ ...s, running: false }));
                    },
                    complete: () => {
                        this.logValue('running', false);
                        this.setState((s) => ({ ...s, running: false }));
                    },
                })
            );
        }
    }
}

export class ReactList<S extends ReactListState> extends ReactView<
    ReactViewProps,
    S
> {
    protected children = new BehaviorSubject<
        ReactView<ReactViewProps, ReactViewState>[]
    >([]);
    protected subviewSubscription: Subscription = new Subscription();

    constructor(props: ReactViewProps) {
        super(props);
        this.state = { ...this.state, childItems: [], spacing: 0 };
    }

    componentDidMount(): void {
        super.componentDidMount();
        const parentList = this.props.parentView as List;
        if (parentList.axis !== null) {
            this.wire('spacing', 'spacing', identity);
        }

        this.subscription.add(
            parentList
                .model!.sink.pipe(
                    distinctUntilChanged(
                        (
                            a1: Dictionary<ListModelItem>[],
                            a2: Dictionary<ListModelItem>[]
                        ) =>
                            isEqualWith(a1, a2, (x, y) =>
                                isPlainObject(x) && isPlainObject(y)
                                    ? modelItemsEqual(x, y)
                                    : undefined
                            )
                    )
                )
                .subscribe((arr) => {
                    const newModelItems = arr as Dictionary<ListModelItem>[];
                    const [reuse, extra] = partition(
                        this.state.childItems,
                        (x) =>
                            newModelItems.findIndex((y) =>
                                prototypeMatch(x, y)
                            ) >= 0
                    );

                    extra.forEach((p) => parentList.returnReusableItem(p));

                    const newItems = newModelItems.map((m, index) => {
                        let item = reuse.find((proto) =>
                            prototypeMatch(proto, m)
                        );
                        if (!item) {
                            item = parentList.requestReusableItem(m, index);
                        }
                        const [key, v] = toPairs(m)[0];
                        item.setModelItem(v as ListModelItem, index);

                        return item;
                    });
                    this.setState({ childItems: newItems });
                })
        );
    }

    componentWillUnmount(): void {
        this.subviewSubscription.unsubscribe();
        super.componentWillUnmount();
    }

    componentDidUpdate(
        prevProps: Readonly<ReactViewProps>,
        prevState: Readonly<ReactListState>,
        snapshot?: any
    ): void {
        const children = this.state.childItems
            .map(v => v.instance)
            .filter(v => v !== null) as ReactView<
            ReactViewProps,
            ReactViewState
        >[];
        if (!isEqual(this.children.value, children)) {
            this.children.next(children);
        }
    }
}

export class ReactListButton extends ReactButtonBase<
    ReactButtonState & { modelItem: ListModelItem | null }
> {
    constructor(props: ReactViewProps) {
        super(props);

        this.state = { ...this.state, modelItem: null };
    }

    componentDidMount(): void {
        super.componentDidMount();
        this.subscription.add(
            (this.props.parentView as ListButton).modelItem.subscribe(x =>
                this.setState({ modelItem: x })
            )
        );
    }

    protected handleClick(
        e: React.MouseEvent<HTMLDivElement, MouseEvent>
    ): void {
        if (this.state.running) return;
        const parent = this.props.parentView as ListButton;
        if (this.state.modelItem !== null) {
            this.logValue('running', true);
            this.setState(s => Object.assign(s, { running: true }));
            e.preventDefault();
            e.stopPropagation();
            const promise = parent.onClick(this.state.modelItem);
            this.subscription.add(
                from(promise).subscribe({
                    error: () => {
                        this.logValue('running', false);
                        this.setState((s) => ({ ...s, running: false }));
                    },
                    complete: () => {
                        this.logValue('running', false);
                        this.setState((s) => ({ ...s, running: false }));
                    },
                })
            );
        }
    }
}

export class ReactListTextField extends ReactTextFieldBase<
    ReactTextFieldState & { modelItem: ListModelItem | null }
> {
    constructor(props: ReactViewProps) {
        super(props);

        this.state = { ...this.state, modelItem: null };
    }

    componentDidMount(): void {
        super.componentDidMount();
        this.subscription.add(
            (this.props.parentView as ListTextField).modelItem.subscribe(x =>
                this.setState({ modelItem: x })
            )
        );
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

export class ReactViewListReference extends ReactView<
    ReactViewProps,
    ReactListState
> {
    render() {
        const parent = this.props.parentView as ViewListReference;
        return parent.createComponent(parent, parent.modelItem);
    }
}
