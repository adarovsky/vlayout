import React, {Component, CSSProperties} from "react";
import {AbsoluteLayout, Container, LinearLayout, StackLayout, View, ViewProperty} from "./view";
import {Dictionary} from "./types";
import {BehaviorSubject, combineLatest, Observable, of, Subscription} from "rxjs";
import {map} from "rxjs/operators";
import _ from "lodash";
import {ElementSize, resizeObserver} from "./resize_sensor";

export interface ReactViewProps {
    parentView: View;
    key?: string;
}

export interface ReactViewState {
    style: CSSProperties;
    aspect: number|null;
    id?: string;
}

export class ReactView<P extends ReactViewProps, S extends ReactViewState> extends Component<P, S> {
    protected readonly  subscription: Subscription = new Subscription();
    readonly viewRef = React.createRef<HTMLDivElement>();
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

        const p = this.props.parentView.property('aspect');
        if (p.value) {
            let self = this.viewRef.current as HTMLElement;
            this.subscription.add(combineLatest([resizeObserver(self), p.value.sink]).subscribe(([size, aspect])=> {
                this.setState({aspect: aspect});
                if (this.state.style.width && !this.state.style.height) {
                    self.style.height = aspect !== null ? `${size.width / aspect}px` : null;
                }
                else if (!this.state.style.width && this.state.style.height) {
                    self.style.width = aspect !== null ? `${size.height * aspect}px` : null;
                }
            }));
        }

        this.wire('id', 'id', _.identity);
    }

    componentWillUnmount(): void {
        this.subscription.unsubscribe();
    }

    constructor(props: P) {
        super(props);
        // @ts-ignore
        this.state = {style: {}, aspect: null, id: null};
    }

    wire(name: string, field: string, mapper: (v: any) => any) {
        const prop = this.props.parentView.property(name);
        if (prop.value) {
            this.subscription.add(prop.value.sink.subscribe( value => {
                let x: Dictionary<any> = {};
                x[field] = mapper ? mapper(value) : value;
                this.setState(s => _.extend(s, x));
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
        if (view.parent instanceof AbsoluteLayout) {
            r.position = 'absolute';
        }

        _.forEach(value, (val, index) => {
            switch (props[index].name) {
                case 'padding.left':
                    if (view.parent instanceof AbsoluteLayout && val !== null)
                        r.left = `${val}px`;
                    break;
                case 'padding.right':
                    if (view.parent instanceof AbsoluteLayout && val !== null)
                        r.right = `${val}px`;
                    break;
                case 'padding.top':
                    if (view.parent instanceof AbsoluteLayout && val !== null)
                        r.top = `${val}px`;
                    break;
                case 'padding.bottom':
                    if (view.parent instanceof AbsoluteLayout && val !== null)
                        r.bottom = `${val}px`;
                    break;
                case 'center.x':
                    if (view.parent instanceof AbsoluteLayout && val !== null) {
                        // adjust width
                        let index = propNames.findIndex(x => x === 'padding.left');
                        if (index >= 0) {
                            r.width = `calc(2*(${val*100}% - ${value[index]}px))`
                        }
                        else {
                            index = propNames.findIndex(x => x === 'padding.right');
                            if (index >= 0) {
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
                    if (view.parent instanceof AbsoluteLayout && val !== null) {
                        // adjust width
                        let index = propNames.findIndex(x => x === 'padding.top');
                        if (index >= 0) {
                            r.height = `calc(2*(${val*100}% - ${value[index]}px))`
                        }
                        else {
                            index = propNames.findIndex(x => x === 'padding.bottom');
                            if (index >= 0) {
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
                    if (view.parent instanceof AbsoluteLayout && val !== null) {
                        r.width = `${val * 100}%`;
                    }
                    break;

                case 'size.height':
                    if (view.parent instanceof AbsoluteLayout && val !== null) {
                        r.height = `${val * 100}%`;
                    }
                    break;

                case 'backgroundColor':
                    r.backgroundColor = val.toString();
                    break;

                case 'sizePolicy':
                    if (val === 'stretched') {
                        r.flex = 1;
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

                // if (!r.width)
                    r.minWidth = '100%';
                // if (!r.height)
                    r.minHeight = '100%';
            }
            else if (this.props.parentView.parent instanceof AbsoluteLayout) {
                const index = this.props.parentView.parent.views.indexOf(this.props.parentView);
                r.zIndex = index + 1;
            }

        });
        return r;
    }

    intrinsicSize(): Observable<ElementSize> {
        let self = this.viewRef.current as HTMLElement;
        if (self) {
            return resizeObserver(self).pipe(
                map( size => {
                    return {
                        width: this.isWidthDefined() ? size.width : 0,
                        height: this.isHeightDefined() ? size.height : 0
                    };
                })
            );
        }
        else {
            return of({width: 0, height: 0});
        }
    }

    render(): React.ReactElement<any, string | React.JSXElementConstructor<any>> | string | number | {} | React.ReactNodeArray | React.ReactPortal | boolean | null | undefined {
        const extra = _.pick(this.state, 'id');
        return (<div style={this.style()} id={this.state.id} className={'vlayout_'+this.props.parentView.viewType()} ref={this.viewRef} {...extra}/>);
    }

    protected isWidthDefined(): boolean {
        return !!this.state.style.width ||
            (this.props.parentView.parent !== null
                && this.props.parentView.parent instanceof StackLayout
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
                && this.props.parentView.parent instanceof StackLayout
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

export class ReactContainer extends ReactView<ReactViewProps, ReactContainerState> {
    state: ReactContainerState = {
        style: {},
        aspect: null,
        childrenVisible: []
    };

    protected children = new BehaviorSubject<ReactView<ReactViewProps, ReactViewState>[]>([]);
    protected subviewSubscription: Subscription = new Subscription();

    componentDidMount(): void {
        super.componentDidMount();

        const props = (this.props.parentView as Container).views.map(v => v.property('alpha').value!.sink);

        this.subscription.add(combineLatest(props).subscribe( value => {
            this.setState(s => _.extend(s, {childrenVisible: value}));
            // this.updateSubviewPositions();
        }));
    }

    componentWillUnmount(): void {
        super.componentWillUnmount();
        this.subviewSubscription.unsubscribe();
    }

    componentDidUpdate(prevProps: Readonly<ReactViewProps>, prevState: Readonly<ReactContainerState>, snapshot?: any): void {
        const children = (this.props.parentView as Container).views
            .map(v => v.instance)
            .filter(v => v !== null) as ReactView<ReactViewProps, ReactViewState>[];
        this.children.next(children);
        this.updateSubviewPositions();
    }

    protected updateSubviewPositions(): void {
        const self = this.viewRef.current;
        if (!self) return;

        this.subviewSubscription.unsubscribe();
        this.subviewSubscription = this.intrinsicSize()
            .subscribe(size => {
                    if (size.width > 0 && !this.isWidthDefined()) {
                        self.style.minWidth = size.width + 'px';
                    }

                    if (size.height > 0 && !this.isHeightDefined()) {
                        self.style.minHeight = size.height + 'px';
                    }
                }
            );
    }

    styleValue(props: ViewProperty[], value: any[]): React.CSSProperties {
        const r = super.styleValue(props, value);
        r.pointerEvents = 'none';
        return r;
    }

    render(): React.ReactElement<any, string | React.JSXElementConstructor<any>> | string | number | {} | React.ReactNodeArray | React.ReactPortal | boolean | null | undefined {
        // @ts-ignore
        const extra = _.pick(this.state, 'id');
        return (<div style={this.style()} className={'vlayout_'+this.props.parentView.viewType()} ref={this.viewRef} {...extra}>
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