import React, { Component, CSSProperties } from 'react';
import { AbsoluteLayout, Container, LinearLayout, LinearLayoutAxis, StackLayout, View, ViewProperty } from './view';
import { BehaviorSubject, combineLatest, Observable, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, map, startWith, switchMap } from 'rxjs/operators';
import { ElementSize, resizeObserver } from './resize_sensor';
import clsx from 'clsx';
import { assign, extend, forEach, identity, isEqual, omit, pick } from 'lodash';
import { assignDeep } from './utils';

export interface ReactViewProps {
    parentView: View;
    key?: string;
    className?: string;
}

export interface ReactViewState {
    style: CSSProperties;
    aspect: number | null;
    id?: string;
    className: string;
    intrinsicSize: ElementSize;
    padding?: { left?: number; right?: number; top?: number; bottom?: number };
    center?: { x?: number; y?: number };
    fixedSize?: { width?: number; height?: number };
    size?: { width?: number; height?: number };
    sizePolicy: 'stretched' | 'fixed';
}

function isAbsolute(view: View | null) {
    // @ts-ignore
    return view instanceof AbsoluteLayout || (view?.hasOwnProperty('axis') && view.axis === null);
}

export class ReactView<P extends ReactViewProps, S extends ReactViewState> extends Component<P, S> {
    readonly _viewRef = new BehaviorSubject<HTMLDivElement | null>(null);
    protected readonly subscription: Subscription = new Subscription();

    constructor(props: P) {
        super(props);

        let id = null;
        const sink = props.parentView.property('id').value?.sink;
        if (sink) {
            this.subscription.add(sink.subscribe(x => id = x));
        }

        // @ts-ignore
        this.state = { style: {}, aspect: null, id: id, className: '' };
        this.setViewRef = this.setViewRef.bind(this);
    }

    get viewRef() {
        return this._viewRef.pipe(filter(x => x !== null)) as Observable<HTMLDivElement>;
    }

    get className(): string {
        return this.getClassName();
    }

    setViewRef(e: HTMLDivElement | null) {
        this._viewRef.next(e);
    }

    componentDidMount(): void {
        this.props.parentView.instance = this;

        const props = this.styleProperties();

        this.subscription.add(
            combineLatest(props.map(p => p.value!.sink)).pipe(
                map(v => this.styleValue(props, v)),
            ).subscribe(
                style => {
                    this.setState({ style: style });
                },
            ),
        );

        this.subscription.add(
            combineLatest(props.map(p => p.value!.sink.pipe(
                map(value => ({ name: p.name, value })),
            ))).pipe(
                map(value => value.reduce((previousValue, currentValue) => assignDeep({ ...previousValue }, {
                    [currentValue.name]: currentValue.value,
                }), {})),
            ).subscribe(
                values => {
                    this.setState(state => assign(omit(state, 'padding', 'center', 'fixedSize', 'size'), values));
                },
            ),
        );

        const isInStack = this.props.parentView.parent instanceof StackLayout;
        this.subscription.add(combineLatest([this.safeIntrinsicSize(), this.viewRef]).pipe(
            debounceTime(1),
        ).subscribe(([size, self]) => {
            if (size.width > 0 && !this.isWidthDefined()) {
                self.style.minWidth = size.width + 'px';
            } else {
                self.style.minWidth = isInStack ? '100%' : '';
            }

            if (size.height > 0 && !this.isHeightDefined()) {
                self.style.minHeight = size.height + 'px';
            } else {
                self.style.minHeight = isInStack ? '100%' : '';
            }
        }));

        const p = this.props.parentView.property('aspect');
        if (p.value) {
            this.subscription.add(combineLatest([this.safeIntrinsicSize(), p.value.sink, this.viewRef]).pipe(
                debounceTime(1),
            ).subscribe(([size, aspect, self]) => {
                this.setState({ aspect: aspect });
                if (this.state.style.width && !this.state.style.height) {
                    self.style.height = aspect !== null ? `${size.width / aspect}px` : '';
                } else if (!this.state.style.width && this.state.style.height) {
                    self.style.width = aspect !== null ? `${size.height * aspect}px` : '';
                } else {
                    if (!this.state.style.width && self.style.width) {
                        self.style.width = '';
                    }
                    if (!this.state.style.height && self.style.height) {
                        self.style.height = '';
                    }
                }
            }));
        }

        this.wire('id', 'id', identity);
        this.wire('class', 'className', identity);
    }

    componentWillUnmount(): void {
        this.subscription.unsubscribe();
    }

    wire(name: string, field: string, mapper: (v: any) => any) {
        const prop = this.props.parentView.property(name);
        if (prop.value) {
            this.subscription.add(prop.value.sink.subscribe(value => {
                this.setState(s => extend({ ...s }, { [field]: mapper ? mapper(value) : value }));
            }));
        }
    }

    style(): React.CSSProperties {
        return this.state.style;
    }

    styleProperties(): ViewProperty[] {
        let props = this.props.parentView.activeProperties.filter(p =>
            p.name.startsWith('padding') ||
            p.name.startsWith('center') ||
            p.name.startsWith('fixedSize') ||
            p.name.startsWith('size.') ||
            p.name === 'backgroundColor' ||
            p.name === 'alpha');
        if (this.props.parentView.parent instanceof LinearLayout) {
            props = props.concat(this.props.parentView.activePropertiesNamed('sizePolicy'));
        }

        return props;
    }

    styleValue(props: ViewProperty[], value: any[]): CSSProperties {
        const propNames = props.map(p => p.name);
        const r: CSSProperties = {};
        const view = this.props.parentView;
        if (isAbsolute(view.parent)) {
            r.position = 'absolute';
        }

        forEach(value, (val, index) => {
            switch (props[index].name) {
                case 'padding.left':
                    if (isAbsolute(view.parent) && val !== null)
                        r.left = `${val}px`;
                    break;
                case 'padding.right':
                    if (isAbsolute(view.parent) && val !== null)
                        r.right = `${val}px`;
                    break;
                case 'padding.top':
                    if (isAbsolute(view.parent) && val !== null)
                        r.top = `${val}px`;
                    break;
                case 'padding.bottom':
                    if (isAbsolute(view.parent) && val !== null)
                        r.bottom = `${val}px`;
                    break;
                case 'center.x':
                    if (isAbsolute(view.parent) && val !== null) {
                        // adjust width
                        let index = propNames.findIndex(x => x === 'padding.left');
                        if (index >= 0 && value[index] !== null) {
                            r.width = `calc(2*(${val * 100}% - ${value[index]}px))`;
                        } else {
                            index = propNames.findIndex(x => x === 'padding.right');
                            if (index >= 0 && value[index] !== null) {
                                r.width = `calc(2*(${(1 - val) * 100}% - ${value[index]}px))`;
                            } else {
                                r.left = `${val * 100}%`;
                                if (r.transform)
                                    r.transform += ' translateX(-50%)';
                                else
                                    r.transform = ' translateX(-50%)';
                            }
                        }
                    }
                    break;
                case 'center.y':
                    if (isAbsolute(view.parent) && val !== null) {
                        // adjust width
                        let index = propNames.findIndex(x => x === 'padding.top');
                        if (index >= 0 && value[index] !== null) {
                            r.height = `calc(2*(${val * 100}% - ${value[index]}px))`;
                        } else {
                            index = propNames.findIndex(x => x === 'padding.bottom');
                            if (index >= 0 && value[index] !== null) {
                                r.height = `calc(2*(${(1 - val) * 100}% - ${value[index]}px))`;
                            } else {
                                r.top = `${val * 100}%`;
                                if (r.transform)
                                    r.transform += ' translateY(-50%)';
                                else
                                    r.transform = ' translateY(-50%)';
                            }
                        }
                    }
                    break;

                case 'fixedSize.width':
                    if (val !== null) r.width = `${val}px`;
                    break;

                case 'fixedSize.height':
                    if (val !== null) r.height = `${val}px`;
                    break;

                case 'size.width':
                    if (isAbsolute(view.parent) && val !== null) {
                        r.width = `${val * 100}%`;
                    }
                    break;

                case 'size.height':
                    if (isAbsolute(view.parent) && val !== null) {
                        r.height = `${val * 100}%`;
                    }
                    break;

                case 'backgroundColor':
                    if (val) {
                        r.backgroundColor = val.toString();
                    }
                    break;

                case 'sizePolicy':
                    if (val === 'stretched') {
                        r.flexGrow = 1;
                        if (this.props.parentView.parent instanceof LinearLayout) {
                            // Workaround to make item shrink work properly. Otherwise it pushes
                            // out another content
                            if (this.props.parentView.parent.axis == LinearLayoutAxis.Horizontal) {
                                r.width = '1px';
                            } else {
                                r.height = '1px';
                            }
                        }
                    }
                    break;

                case 'alpha':
                    if (val < 1 && val > 0) {
                        r.opacity = val;
                    }
                    break;
            }

            if (this.props.parentView.parent instanceof StackLayout) {
                r.position = 'absolute';
                const index = this.props.parentView.parent.views.indexOf(this.props.parentView);
                r.zIndex = index + 1;

                r.minWidth = '100%';
                r.minHeight = '100%';
                r.maxWidth = '100%';
                r.maxHeight = '100%';
            } else if (this.props.parentView.parent instanceof AbsoluteLayout) {
                const index = this.props.parentView.parent.views.indexOf(this.props.parentView);
                r.zIndex = index + 1;
            }

        });
        return r;
    }

    hasExplicitWidth(): boolean {
        return this.props.parentView.activePropertiesNamed('fixedSize.width', 'size.width').length > 0;
    }

    hasExplicitHeight(): boolean {
        return this.props.parentView.activePropertiesNamed('fixedSize.height', 'size.height').length > 0;
    }

    safeIntrinsicSize(): Observable<ElementSize> {
        if (this.hasExplicitHeight() && this.hasExplicitWidth()) {
            return this.selfSize();
        } else if (!this.hasExplicitHeight() && !this.hasExplicitWidth()) {
            return this.intrinsicSize();
        } else {
            return combineLatest([this.intrinsicSize(), this.selfSize()]).pipe(
                map(([intrinsic, self]) => ({
                    width: this.hasExplicitWidth() ? self.width : intrinsic.width,
                    height: this.hasExplicitHeight() ? self.height : intrinsic.height,
                })),
                distinctUntilChanged((x, y) => x.width === y.width && x.height === y.height),
            );
        }
    }

    selfSize(): Observable<ElementSize> {
        return this.viewRef.pipe(
            switchMap(self => resizeObserver(self).pipe(
                map(size => {
                    return {
                        width: this.isWidthDefined() ? size.width : 0,
                        height: this.isHeightDefined() ? size.height : 0,
                    };
                })),
            ),
            startWith({ width: 0, height: 0 }),
            distinctUntilChanged((x, y) => x.width === y.width && x.height === y.height),
        );
    }

    intrinsicSize(): Observable<ElementSize> {
        return this.selfSize();
    }

    getClassName(): string {
        return clsx(['vlayout_' + this.props.parentView.viewType(), this.props.className, this.state.className]);
    }

    render(): React.ReactElement<any, string | React.JSXElementConstructor<any>> | string | number | {} | React.ReactNodeArray | React.ReactPortal | boolean | null | undefined {
        const extra = pick(this.state, 'id');
        return (
            <div style={this.style()} id={this.state.id} className={this.className}
                 ref={this.setViewRef} {...extra} />);
    }

    definesChildWidth(child: ReactView<ReactViewProps, ReactViewState>): boolean {
        return false;
    }

    definesChildHeight(child: ReactView<ReactViewProps, ReactViewState>): boolean {
        return false;
    }

    isVerticallyScrollable(): boolean {
        return false;
    }

    isHorizontallyScrollable(): boolean {
        return false;
    }

    protected isWidthDefined(): boolean {
        return !!this.state.fixedSize?.width ||
            (this.props.parentView.parent?.instance?.definesChildWidth(this) ?? false) ||
            ((!!this.state.size?.height || !!this.state.fixedSize?.height || (this.props.parentView.parent?.instance?.definesChildHeight(this) ?? false))
                && !!this.state.aspect);
    }

    protected isHeightDefined(): boolean {
        return !!this.state.fixedSize?.height ||
            (this.props.parentView.parent?.instance?.definesChildHeight(this) ?? false) ||
            ((!!this.state.size?.width || !!this.state.fixedSize?.width || (this.props.parentView.parent?.instance?.definesChildWidth(this) ?? false))
                && !!this.state.aspect);
    }
}

export interface ReactContainerState extends ReactViewState {
    childrenVisible: boolean[];
}

export class ReactContainer<S extends ReactContainerState> extends ReactView<ReactViewProps, S> {
    protected children = new BehaviorSubject<ReactView<ReactViewProps, ReactViewState>[]>([]);
    protected subviewSubscription: Subscription = new Subscription();

    constructor(props: ReactViewProps) {
        super(props);
        this.state = { ...this.state, childrenVisible: [] };
    }

    componentDidMount(): void {
        super.componentDidMount();

        const props = (this.props.parentView as Container).views.map(v => v.property('alpha').value!.sink);

        this.subscription.add(combineLatest(props).subscribe(childrenVisible => {
            this.setState(s => ({ ...s, childrenVisible }));
        }));
    }

    componentWillUnmount(): void {
        this.subviewSubscription.unsubscribe();
        super.componentWillUnmount();
    }

    componentDidUpdate(): void {
        const children = (this.props.parentView as Container).views
            .map(v => v.instance)
            .filter(v => v !== null) as ReactView<ReactViewProps, ReactViewState>[];
        if (!isEqual(this.children.value, children)) {
            this.children.next(children);
        }
    }

    styleProperties(): ViewProperty[] {
        return super.styleProperties().concat(this.props.parentView.activePropertiesNamed('interactive'));
    }

    styleValue(props: ViewProperty[], value: any[]): React.CSSProperties {
        const r = super.styleValue(props, value);

        const index = props.findIndex(p => p.name === 'interactive');
        if (index >= 0 && value[index]) {
            r.pointerEvents = 'auto';
        } else {
            r.pointerEvents = 'none';
        }
        return r;
    }

    render() {
        const extra = pick(this.state, 'id');
        return (<div style={this.style()} className={this.className} ref={this.setViewRef} {...extra}>
            {(this.props.parentView as Container).views
                .filter((v, index) => this.state.childrenVisible[index])
                .map(v => v.target)}
        </div>);
    }

}

export class ReactViewReference<P extends ReactViewProps, S extends ReactViewState> extends ReactView<P, S> {

    styleValue(props: ViewProperty[], value: any[]): React.CSSProperties {
        const r = super.styleValue(props, value);
        r.pointerEvents = 'auto';
        return r;
    }
}
