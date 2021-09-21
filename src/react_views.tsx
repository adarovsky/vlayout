import React, { Component, CSSProperties } from 'react';
import {
    AbsoluteLayout,
    Container,
    LinearLayout,
    LinearLayoutAxis,
    StackLayout,
    View,
    ViewProperty,
} from './view';
import {
    asyncScheduler,
    BehaviorSubject,
    combineLatest,
    EMPTY,
    Observable,
    of,
    Subscription,
} from 'rxjs';
import {
    distinctUntilChanged,
    filter,
    map,
    shareReplay,
    startWith,
    subscribeOn,
    switchMap,
    tap,
    throttleTime,
} from 'rxjs/operators';
import { ElementSize, resizeObserver } from './resize_sensor';
import clsx from 'clsx';
import {
    assign,
    extend,
    forEach,
    forIn,
    fromPairs,
    identity,
    isEqual,
    omit,
    pick,
} from 'lodash';
import { assignDeep, isNotNull } from './utils';
import composeRefs from '@seznam/compose-react-refs';

export interface ReactViewProps {
    parentView: View;
    key?: string;
    className?: string;
    innerRef?: React.Ref<HTMLDivElement>;
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
    return (
        view instanceof AbsoluteLayout ||
        (view?.hasOwnProperty('axis') && (view as any).axis === null)
    );
}

export class ReactView<
    P extends ReactViewProps,
    S extends ReactViewState
> extends Component<P, S> {
    readonly _viewRef = new BehaviorSubject<HTMLDivElement | null>(null);
    protected readonly subscription: Subscription = new Subscription();

    constructor(props: P) {
        super(props);

        let id = null;
        const sink = props.parentView.property('id').value?.sink;
        if (sink) {
            this.subscription.add(sink.subscribe((x) => (id = x)));
        }

        this.state = { style: {}, aspect: null, id: id, className: '' } as any;
        this.setViewRef = this.setViewRef.bind(this);
    }

    get viewRef() {
        return this._viewRef.pipe(
            filter((x) => x !== null)
        ) as Observable<HTMLDivElement>;
    }

    get className(): string {
        return this.getClassName();
    }

    setViewRef(e: HTMLDivElement | null) {
        this._viewRef.next(e);
    }

    componentDidMount(): void {
        this.props.parentView.instance = this;

        this.wire('aspect', 'aspect', identity);

        const props = this.styleProperties();

        const inputIsUpdating =
            this.props.parentView.scope?.engine.inputs.inputIsUpdating ??
            of(false as boolean);

        const propValues: Observable<any> = combineLatest(
            props.map((p) => p.value!.sink)
        );

        this.subscription.add(
            combineLatest([inputIsUpdating, propValues])
                .pipe(
                    filter(([updating]) => !updating),
                    map(([, v]) => v),
                    map((v) => this.styleValue(props, v)),
                    distinctUntilChanged(isEqual)
                )
                .subscribe((style) => {
                    this.logValue('style', style);
                    this.setState({ style: style });
                })
        );

        const keyValues = combineLatest(
            props.map((p) =>
                p.value!.sink.pipe(
                    map((value) => ({
                        name: p.name,
                        value,
                    }))
                )
            )
        );

        this.subscription.add(
            combineLatest([inputIsUpdating, keyValues])
                .pipe(
                    filter(([updating]) => !updating),
                    map(([, v]) => v),
                    map((value) =>
                        value.reduce(
                            (previousValue, currentValue) =>
                                assignDeep(
                                    { ...previousValue },
                                    {
                                        [currentValue.name]: currentValue.value,
                                    }
                                ),
                            {}
                        )
                    ),
                    distinctUntilChanged(isEqual)
                )
                .subscribe((values) => {
                    forIn(values, (val, key) => this.logValue(key, val));

                    this.setState((state) =>
                        assign(
                            omit(
                                state,
                                'padding',
                                'center',
                                'fixedSize',
                                'size'
                            ),
                            values
                        )
                    );
                })
        );

        const isInStack = this.props.parentView.parent instanceof StackLayout;
        this.subscription.add(
            combineLatest([
                inputIsUpdating,
                this.safeIntrinsicSize(),
                this.viewRef,
            ])
                .pipe(
                    filter(([updating]) => !updating),
                    map(([, size, self]) => ({
                        size,
                        self,
                    }))
                )
                .subscribe(({ size, self }) => {
                    if (!this.isWidthDefined()) {
                        self.style.minWidth =
                            size.width > 0 ? size.width + 'px' : '';
                    } else if (isInStack) {
                        self.style.width =
                            self.style.minWidth =
                            self.style.maxWidth =
                                '100%';
                    }

                    if (!this.isHeightDefined()) {
                        self.style.minHeight =
                            size.height > 0 ? size.height + 'px' : '';
                    } else if (isInStack) {
                        self.style.height =
                            self.style.minHeight =
                            self.style.maxHeight =
                                '100%';
                    }
                })
        );

        const p = this.props.parentView.property('aspect');
        if (p.value) {
            const parent = this.props.parentView;

            this.subscription.add(
                combineLatest([
                    inputIsUpdating,
                    this.safeIntrinsicSize(),
                    p.value.sink.pipe(
                        distinctUntilChanged((x, y) => Math.abs(x - y) < 0.01)
                    ),
                    this.viewRef.pipe(distinctUntilChanged()),
                ])
                    .pipe(
                        filter(([updating]) => !updating),
                        map(([, size, aspect, self]) => ({
                            size,
                            aspect,
                            self,
                        })),
                        throttleTime(5, asyncScheduler, {
                            leading: true,
                            trailing: true,
                        })
                    )
                    .subscribe(({ size, aspect, self }) => {
                        const widthDefined =
                            isNotNull(this.state.fixedSize?.width) ||
                            !!parent.parent?.instance?.definesChildWidth(this);

                        const heightDefined =
                            isNotNull(this.state.fixedSize?.height) ||
                            !!parent.parent?.instance?.definesChildHeight(this);

                        if (widthDefined && !heightDefined) {
                            self.style.height =
                                self.style.minHeight =
                                self.style.maxHeight =
                                    aspect !== null
                                        ? `${size.width / aspect}px`
                                        : '';
                        } else if (!widthDefined && heightDefined) {
                            self.style.width =
                                self.style.minWidth =
                                self.style.maxWidth =
                                    aspect !== null
                                        ? `${size.height * aspect}px`
                                        : '';
                        } else if (!widthDefined && !heightDefined) {
                            if (self.style.width) {
                                self.style.width =
                                    self.style.minWidth =
                                    self.style.maxWidth =
                                        '';
                            }
                            if (self.style.height) {
                                self.style.height =
                                    self.style.minHeight =
                                    self.style.maxHeight =
                                        '';
                            }
                        }
                    })
            );
        }

        this.wire('id', 'id', identity);
        this.wire('class', 'className', identity);
    }

    componentWillUnmount(): void {
        this.subscription.unsubscribe();
    }

    wire(name: string, field: string, mapper: (v: any) => any) {
        const prop = this.props.parentView.property(name);
        if (prop?.value) {
            const inputIsUpdating =
                this.props.parentView.scope?.engine.inputs.inputIsUpdating ??
                of(false as boolean);

            this.subscription.add(
                combineLatest([inputIsUpdating, prop.value.sink])
                    .pipe(
                        filter(([upd]) => !upd),
                        map(([, val]) => val),
                        distinctUntilChanged((x, y) => isEqual(x, y))
                    )
                    .subscribe((value) => {
                        const val = mapper ? mapper(value) : value;
                        this.logValue(field, val);
                        this.setState((s) =>
                            extend({ ...s }, { [field]: val })
                        );
                    })
            );
        }
    }

    protected logValue(field: string, val: any) {
        const id = this.state.id;
        if (
            isNotNull(id) &&
            this.props.parentView.scope?.engine.verboseIds?.includes(id)
        ) {
            console.log(`${id}: setState( ${field},`, val, `)`);
        }
    }

    has(property: string): boolean {
        return isNotNull(this.props.parentView.property(property).value);
    }

    style(): React.CSSProperties {
        return this.state.style;
    }

    styleProperties(): ViewProperty[] {
        let props = this.props.parentView.activeProperties.filter(
            (p) =>
                p.name.startsWith('padding') ||
                p.name.startsWith('center') ||
                p.name.startsWith('fixedSize') ||
                p.name.startsWith('size.') ||
                p.name === 'backgroundColor' ||
                p.name === 'alpha'
        );
        if (this.props.parentView.parent instanceof LinearLayout) {
            props = props.concat(
                this.props.parentView.activePropertiesNamed('sizePolicy')
            );
        }

        return props;
    }

    styleValue(props: ViewProperty[], value: any[]): CSSProperties {
        const propNames = props.map((p) => p.name);
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
                        let index = propNames.findIndex(
                            (x) => x === 'padding.left'
                        );
                        if (index >= 0 && value[index] !== null) {
                            r.width =
                                r.minWidth =
                                r.maxWidth =
                                    `calc(2*(${val * 100}% - ${
                                        value[index]
                                    }px))`;
                        } else {
                            index = propNames.findIndex(
                                (x) => x === 'padding.right'
                            );
                            if (index >= 0 && value[index] !== null) {
                                r.width =
                                    r.minWidth =
                                    r.maxWidth =
                                        `calc(2*(${(1 - val) * 100}% - ${
                                            value[index]
                                        }px))`;
                            } else {
                                r.left = `${val * 100}%`;
                                if (r.transform)
                                    r.transform += ' translateX(-50%)';
                                else r.transform = ' translateX(-50%)';
                            }
                        }
                    }
                    break;
                case 'center.y':
                    if (isAbsolute(view.parent) && val !== null) {
                        // adjust width
                        let index = propNames.findIndex(
                            (x) => x === 'padding.top'
                        );
                        if (index >= 0 && value[index] !== null) {
                            r.height =
                                r.minHeight =
                                r.maxHeight =
                                    `calc(2*(${val * 100}% - ${
                                        value[index]
                                    }px))`;
                        } else {
                            index = propNames.findIndex(
                                (x) => x === 'padding.bottom'
                            );
                            if (index >= 0 && value[index] !== null) {
                                r.height =
                                    r.minHeight =
                                    r.maxHeight =
                                        `calc(2*(${(1 - val) * 100}% - ${
                                            value[index]
                                        }px))`;
                            } else {
                                r.top = `${val * 100}%`;
                                if (r.transform)
                                    r.transform += ' translateY(-50%)';
                                else r.transform = ' translateY(-50%)';
                            }
                        }
                    }
                    break;

                case 'fixedSize.width':
                    if (val !== null)
                        r.width = r.minWidth = r.maxWidth = `${val}px`;
                    break;

                case 'fixedSize.height':
                    if (val !== null)
                        r.height = r.minHeight = r.maxHeight = `${val}px`;
                    break;

                case 'size.width':
                    if (isAbsolute(view.parent) && val !== null) {
                        r.width = r.minWidth = r.maxWidth = `${val * 100}%`;
                    }
                    break;

                case 'size.height':
                    if (isAbsolute(view.parent) && val !== null) {
                        r.height = r.minHeight = r.maxHeight = `${val * 100}%`;
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
                        if (
                            this.props.parentView.parent instanceof LinearLayout
                        ) {
                            // Workaround to make item shrink work properly. Otherwise it pushes
                            // out another content
                            if (
                                this.props.parentView.parent.axis ==
                                LinearLayoutAxis.Horizontal
                            ) {
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
                const index = this.props.parentView.parent.views.indexOf(
                    this.props.parentView
                );
                r.zIndex = index + 1;

                r.minWidth = '100%';
                r.minHeight = '100%';
                r.maxWidth = '100%';
                r.maxHeight = '100%';
                r.height = '100%';
                r.width = '100%';
            } else if (this.props.parentView.parent instanceof AbsoluteLayout) {
                const index = this.props.parentView.parent.views.indexOf(
                    this.props.parentView
                );
                r.zIndex = index + 1;
            }
        });
        return r;
    }

    hasExplicitWidth(): boolean {
        return (
            this.props.parentView.activePropertiesNamed(
                'fixedSize.width',
                'size.width'
            ).length > 0
        );
    }

    hasExplicitHeight(): boolean {
        return (
            this.props.parentView.activePropertiesNamed(
                'fixedSize.height',
                'size.height'
            ).length > 0
        );
    }

    safeIntrinsicSize(): Observable<ElementSize> {
        if (this.hasExplicitHeight() && this.hasExplicitWidth()) {
            return this.selfSize();
        } else if (!this.hasExplicitHeight() && !this.hasExplicitWidth()) {
            return this.intrinsicSize().pipe(
                distinctUntilChanged(
                    (x, y) =>
                        Math.abs(x.width - y.width) < 0.5 &&
                        Math.abs(x.height - y.height) < 0.5
                )
            );
        } else {
            return combineLatest([this.intrinsicSize(), this.selfSize()]).pipe(
                map(([intrinsic, self]) => ({
                    width: this.hasExplicitWidth()
                        ? self.width
                        : intrinsic.width,
                    height: this.hasExplicitHeight()
                        ? self.height
                        : intrinsic.height,
                })),
                distinctUntilChanged(
                    (x, y) =>
                        Math.abs(x.width - y.width) < 0.5 &&
                        Math.abs(x.height - y.height) < 0.5
                )
            );
        }
    }

    selfSize(): Observable<ElementSize> {
        return this.viewRef.pipe(
            switchMap((self) =>
                resizeObserver(self).pipe(
                    map((size) => {
                        return {
                            width: this.isWidthDefined() ? size.width : 0,
                            height: this.isHeightDefined() ? size.height : 0,
                        };
                    })
                )
            ),
            startWith({ width: 0, height: 0 }),
            distinctUntilChanged(
                (x, y) =>
                    Math.abs(x.width - y.width) < 0.5 &&
                    Math.abs(x.height - y.height) < 0.5
            )
        );
    }

    intrinsicSize(): Observable<ElementSize> {
        return this.selfSize();
    }

    getClassName(): string {
        return clsx([
            'vlayout_' + this.props.parentView.viewType(),
            this.props.className,
            this.state.className,
        ]);
    }

    render() {
        const extra = pick(this.state, 'id');
        return (
            <div
                style={this.style()}
                id={this.state.id}
                className={this.className}
                ref={composeRefs(this.setViewRef, this.props.innerRef)}
                {...extra}
            />
        );
    }

    definesChildWidth(
        child: ReactView<ReactViewProps, ReactViewState>
    ): boolean {
        return false;
    }

    definesChildHeight(
        child: ReactView<ReactViewProps, ReactViewState>
    ): boolean {
        return false;
    }

    isVerticallyScrollable(): boolean {
        return false;
    }

    isHorizontallyScrollable(): boolean {
        return false;
    }

    protected isWidthDefined(): boolean {
        return (
            !!this.state.fixedSize?.width ||
            (this.props.parentView.parent?.instance?.definesChildWidth(this) ??
                false) ||
            ((!!this.state.size?.height ||
                !!this.state.fixedSize?.height ||
                (this.props.parentView.parent?.instance?.definesChildHeight(
                    this
                ) ??
                    false)) &&
                !!this.state.aspect)
        );
    }

    protected isHeightDefined(): boolean {
        return (
            !!this.state.fixedSize?.height ||
            (this.props.parentView.parent?.instance?.definesChildHeight(this) ??
                false) ||
            ((!!this.state.size?.width ||
                !!this.state.fixedSize?.width ||
                (isNotNull(this.state.padding?.left) &&
                    isNotNull(this.state.padding?.right)) ||
                (this.props.parentView.parent?.instance?.definesChildWidth(
                    this
                ) ??
                    false)) &&
                isNotNull(this.state.aspect))
        );
    }
}

export interface ReactContainerState extends ReactViewState {
    childrenVisible: boolean[];
}

export class ReactContainer<S extends ReactContainerState> extends ReactView<
    ReactViewProps,
    S
> {
    protected children = new BehaviorSubject<
        ReactView<ReactViewProps, ReactViewState>[]
    >([]);
    protected subviewSubscription: Subscription = new Subscription();

    constructor(props: ReactViewProps) {
        super(props);
        this.state = { ...this.state, childrenVisible: [] };
    }

    componentDidMount(): void {
        super.componentDidMount();

        const props = (this.props.parentView as Container).views.map((v) =>
            v.property('alpha').value!.sink.pipe(map((x: number) => x > 0))
        );

        const inputIsUpdating =
            this.props.parentView.scope?.engine.inputs.inputIsUpdating ??
            of(false as boolean);

        const visible: Observable<boolean[]> = combineLatest([
            inputIsUpdating,
            combineLatest(props),
        ]).pipe(
            filter(([updating]) => !updating),
            map(([, props]) => props),
            distinctUntilChanged(isEqual)
            // tap(console.log)
        );

        this.subscription.add(
            visible.subscribe((childrenVisible) => {
                this.setState((s) => ({ ...s, childrenVisible }));
            })
        );
    }

    componentWillUnmount(): void {
        this.subviewSubscription.unsubscribe();
        super.componentWillUnmount();
    }

    componentDidUpdate(): void {
        const children = (this.props.parentView as Container).views
            .map((v) => v.instance)
            .filter((v) => v !== null) as ReactView<
            ReactViewProps,
            ReactViewState
        >[];
        if (!isEqual(this.children.value, children)) {
            this.children.next(children);
        }
    }

    styleProperties(): ViewProperty[] {
        return super
            .styleProperties()
            .concat(this.props.parentView.activePropertiesNamed('interactive'));
    }

    styleValue(props: ViewProperty[], value: any[]): React.CSSProperties {
        const r = super.styleValue(props, value);

        const index = props.findIndex((p) => p.name === 'interactive');
        if (index >= 0 && value[index]) {
            r.pointerEvents = 'auto';
        } else {
            r.pointerEvents = 'none';
        }
        return r;
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
                {(this.props.parentView as Container).views
                    .filter((v, index) => this.state.childrenVisible[index])
                    .map((v) => v.target)}
            </div>
        );
    }
}

export class ReactViewReference<
    P extends ReactViewProps,
    S extends ReactViewState
> extends ReactView<P, S> {
    styleProperties(): ViewProperty[] {
        return super
            .styleProperties()
            .concat(this.props.parentView.activePropertiesNamed('interactive'));
    }

    styleValue(props: ViewProperty[], value: any[]): React.CSSProperties {
        const r = super.styleValue(props, value);

        const index = props.findIndex((p) => p.name === 'interactive');
        if (index >= 0 && !value[index]) {
            r.pointerEvents = 'none';
        } else {
            r.pointerEvents = 'auto';
        }
        return r;
    }
}
