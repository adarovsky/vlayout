import React, { Component, CSSProperties } from 'react';
import { AbsoluteLayout, Container, LinearLayout, LinearLayoutAxis, StackLayout, View, ViewProperty } from './view';
import { Dictionary } from './types';
import { BehaviorSubject, combineLatest, Observable, Subscription } from 'rxjs';
import { filter, map, switchMap } from 'rxjs/operators';
import { ElementSize, resizeObserver } from './resize_sensor';
import clsx from 'clsx';
import { extend, forEach, identity, isEqual, pick } from 'lodash';

export interface ReactViewProps {
    parentView: View;
    key?: string;
    className?: string;
}

export interface ReactViewState {
    style: CSSProperties;
    aspect: number|null;
    id?: string;
    className: string;
}

function isAbsolute(view: View|null) {
    // @ts-ignore
    return view instanceof AbsoluteLayout || (view?.hasOwnProperty('axis') && view.axis === null);
}

export class ReactView<P extends ReactViewProps, S extends ReactViewState> extends Component<P, S> {
    protected readonly  subscription: Subscription = new Subscription();
    readonly _viewRef = new BehaviorSubject<HTMLDivElement|null>(null);
    setViewRef(e: HTMLDivElement|null) {
        this._viewRef.next(e);
    }
    get viewRef() {
        return this._viewRef.pipe(filter(x => x !== null)) as Observable<HTMLDivElement>;
    }

    componentDidMount(): void {
        this.props.parentView.instance = this;

        const props = this.styleProperties();

        this.subscription.add(
            combineLatest(props.map(p => p.value!.sink)).pipe(
                map(v=>this.styleValue(props, v))
            ).subscribe(
            style => {
                this.setState({style: style});
            }
        ));


        const isInStack = this.props.parentView.parent instanceof StackLayout;
        this.subscription.add(combineLatest([this.intrinsicSize(), this.viewRef])
            .subscribe(([size, self]) => {
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
            this.subscription.add(combineLatest([this.intrinsicSize(), p.value.sink, this.viewRef])
                .subscribe(([size, aspect, self]) => {
                    this.setState({aspect: aspect});
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

    constructor(props: P) {
        super(props);

        let id = null;
        const sink = props.parentView.property('id').value?.sink;
        sink?.subscribe(x => id = x);

        // @ts-ignore
        this.state = {style: {}, aspect: null, id: id, className: ''};
        this.setViewRef = this.setViewRef.bind(this);
    }

    wire(name: string, field: string, mapper: (v: any) => any) {
        const prop = this.props.parentView.property(name);
        if (prop.value) {
            this.subscription.add(prop.value.sink.subscribe( value => {
                let x: Dictionary<any> = {};
                x[field] = mapper ? mapper(value) : value;
                this.setState(s => extend({...s}, x));
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
                            r.width = `calc(2*(${val*100}% - ${value[index]}px))`
                        }
                        else {
                            index = propNames.findIndex(x => x === 'padding.right');
                            if (index >= 0 && value[index] !== null) {
                                r.width = `calc(2*(${(1-val)*100}% - ${value[index]}px))`
                            }
                            else {
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
                            r.height = `calc(2*(${val*100}% - ${value[index]}px))`
                        }
                        else {
                            index = propNames.findIndex(x => x === 'padding.bottom');
                            if (index >= 0 && value[index] !== null) {
                                r.height = `calc(2*(${(1-val)*100}% - ${value[index]}px))`
                            }
                            else {
                                r.top = `${val * 100}%`;
                                if (r.transform)
                                    r.transform += ' translateY(-50%)';
                                else
                                    r.transform = ' translateY(-50%)';
                            }
                        }                        }
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
                    r.backgroundColor = val.toString();
                    break;

                case 'sizePolicy':
                    if (val === 'stretched') {
                        r.flexGrow = 1;
                        if (this.props.parentView.parent instanceof LinearLayout) {
                            // Workaround to make item shrink work properly. Otherwise it pushes
                            // out another content
                            if (this.props.parentView.parent.axis == LinearLayoutAxis.Horizontal) {
                                r.width = '1px';
                            }
                            else {
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
            }
            else if (this.props.parentView.parent instanceof AbsoluteLayout) {
                const index = this.props.parentView.parent.views.indexOf(this.props.parentView);
                r.zIndex = index + 1;
            }

        });
        return r;
    }

    intrinsicSize(): Observable<ElementSize> {
        return this.viewRef.pipe(
            switchMap(self => resizeObserver(self).pipe(
                map( size => {
                    return {
                        width: this.isWidthDefined() ? size.width : 0,
                        height: this.isHeightDefined() ? size.height : 0
                    };
                }))
            )
        );
    }

    getClassName(): string {
        return clsx(['vlayout_'+this.props.parentView.viewType(), this.props.className, this.state.className]);
    }

    get className(): string {
        return this.getClassName();
    }

    render(): React.ReactElement<any, string | React.JSXElementConstructor<any>> | string | number | {} | React.ReactNodeArray | React.ReactPortal | boolean | null | undefined {
        const extra = pick(this.state, 'id');
        return (<div style={this.style()} id={this.state.id} className={this.className} ref={this.setViewRef} {...extra}/>);
    }

    protected isWidthDefined(): boolean {
        return !!this.state.style.width ||
            (this.props.parentView.parent !== null
                && (this.props.parentView.parent instanceof StackLayout ||
                    this.props.parentView.parent instanceof LinearLayout)
                && this.props.parentView.parent.instance !== null
                && this.props.parentView.parent.instance.isWidthDefined()) ||
            (!!this.state.style.left && !!this.state.style.right
                && this.props.parentView.parent !== null
                && this.props.parentView.parent.instance !== null
                && this.props.parentView.parent.instance.isWidthDefined()) ||
            (!!this.state.style.height && !!this.state.aspect);
    }

    protected isHeightDefined(): boolean {
        return !!this.state.style.height ||
            (this.props.parentView.parent !== null
                && (this.props.parentView.parent instanceof StackLayout ||
                    this.props.parentView.parent instanceof LinearLayout)
                && this.props.parentView.parent.instance !== null
                && this.props.parentView.parent.instance.isHeightDefined()) ||
            (!!this.state.style.top && !!this.state.style.bottom
                && this.props.parentView.parent !== null
                && this.props.parentView.parent.instance !== null
                && this.props.parentView.parent.instance.isHeightDefined()) ||
            (!!this.state.style.width && !!this.state.aspect);
    }
}

export interface ReactContainerState extends ReactViewState{
    childrenVisible: boolean[];
}

export class ReactContainer<S extends ReactContainerState> extends ReactView<ReactViewProps, S> {
    constructor(props: ReactViewProps) {
        super(props);
        this.state = {...this.state, childrenVisible: []};
    }

    protected children = new BehaviorSubject<ReactView<ReactViewProps, ReactViewState>[]>([]);
    protected subviewSubscription: Subscription = new Subscription();

    componentDidMount(): void {
        super.componentDidMount();

        const props = (this.props.parentView as Container).views.map(v => v.property('alpha').value!.sink);

        this.subscription.add(combineLatest(props).subscribe( value => {
            this.setState(s => extend(s, {childrenVisible: value}));
            // this.updateSubviewPositions();
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
            this.updateSubviewPositions();
        }
    }

    protected updateSubviewPositions(): void {
    }

    styleValue(props: ViewProperty[], value: any[]): React.CSSProperties {
        const r = super.styleValue(props, value);
        r.pointerEvents = 'none';
        return r;
    }

    render() {
        const extra = pick(this.state, 'id');
        return (<div style={this.style()} className={this.className} ref={this.setViewRef} {...extra}>
            {(this.props.parentView as Container).views
                .filter((v, index) => this.state.childrenVisible[index])
                .map( v => v.target )}
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
