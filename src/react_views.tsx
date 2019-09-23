import React, {Component, CSSProperties} from "react";
import {AbsoluteLayout, Container, LinearLayout, StackLayout, View, ViewProperty} from "./view";
import {Dictionary} from "./types";
import {combineLatest, Subscription} from "rxjs";
import {map} from "rxjs/operators";
import _ from "lodash";
import {resizeObserver} from "./resize_sensor";

export interface ReactViewProps {
    parentView: View;
    key?: string;
}

export interface ReactViewState {
    style: CSSProperties;
}

export class ReactView<S extends ReactViewState> extends Component<ReactViewProps, S> {
    protected readonly  subscription: Subscription = new Subscription();
    protected readonly viewRef = React.createRef();
    componentDidMount(): void {
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
            this.subscription.add(combineLatest([resizeObserver(self), p.value.sink]).subscribe(x=> {
                if (this.state.style.width && !this.state.style.height) {
                    self.style.height = `${x[0].width / x[1]}px`;
                }
                else if (!this.state.style.width && this.state.style.height) {
                    self.style.width = `${x[0].height * x[1]}px`;
                }
            }));
        }

    }

    componentWillUnmount(): void {
        if (this.subscription) {
            this.subscription.unsubscribe();
        }
    }

    constructor(props: ReactViewProps) {
        super(props);
        // @ts-ignore
        this.state = {style: {}};
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
                    else if (val === 0) {
                        r.display = 'none';
                    }
                    break;
            }

            if (this.props.parentView.parent instanceof StackLayout) {
                r.position = 'absolute';
                const index = this.props.parentView.parent.views.indexOf(this.props.parentView);
                r.zIndex = index + 1;

                if (!r.width)
                    r.width = '100%';
                if (!r.height)
                    r.height = '100%';
            }

        });
        return r;
    }

    render(): React.ReactElement<any, string | React.JSXElementConstructor<any>> | string | number | {} | React.ReactNodeArray | React.ReactPortal | boolean | null | undefined {
        // @ts-ignore
        return (<div style={this.style()} className={'vlayout_'+this.props.parentView.viewType()} ref={this.viewRef}/>);
    }

}

export class ReactContainer extends ReactView<ReactViewState> {

    styleValue(props: ViewProperty[], value: any[]): React.CSSProperties {
        const r = super.styleValue(props, value);
        r.pointerEvents = 'none';
        return r;
    }

    render(): React.ReactElement<any, string | React.JSXElementConstructor<any>> | string | number | {} | React.ReactNodeArray | React.ReactPortal | boolean | null | undefined {
        // @ts-ignore
        return (<div style={this.style()} className={'vlayout_'+this.props.parentView.viewType()} ref={this.viewRef}>
            {(this.props.parentView as Container).views.map( v => v.target )}
        </div>);
    }
}
