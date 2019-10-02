import {ReactContainer, ReactContainerState, ReactView, ReactViewProps, ReactViewState} from "./react_views";
import {Container, ViewProperty} from "./view";
import React, {CSSProperties} from "react";
import _ from "lodash";
import {ReactStackLayout} from "./react_stack";
import {combineLatest, Observable, of, Subscription} from "rxjs";
import {ElementSize} from "./resize_sensor";
import {map, switchMap} from "rxjs/operators";

class ReactLinearLayout extends ReactContainer {
    state = {
        spacing: 0,
        aspect: null,
        style: {} as CSSProperties,
        childrenVisible: []
    };

    protected subviewSubscription: Subscription = new Subscription();

    componentDidMount(): void {
        super.componentDidMount();
        this.wire('spacing', 'spacing', _.identity);
    }

    protected spacerStyle(): CSSProperties {
        return {width: this.state.spacing + 'px'}
    }

    render(): React.ReactElement<any, string | React.JSXElementConstructor<any>> | string | number | {} | React.ReactNodeArray | React.ReactPortal | boolean | null | undefined {
        // @ts-ignore
        return (<div style={this.style()} className={'vlayout_'+this.props.parentView.viewType()} ref={this.viewRef}>
            {(this.props.parentView as Container).views
                .filter((v, index) => this.state.childrenVisible[index])
                .flatMap( (v, index) => {
                    const result = [v.target];
                    if (index > 0 && this.state.spacing)
                        result.unshift(<div style={this.spacerStyle()} key={index}/>);
                    return result;
                })}
        </div>);
    }
}

export class ReactHorizontalLayout extends ReactLinearLayout {

    componentWillUnmount(): void {
        super.componentWillUnmount();
        this.subviewSubscription.unsubscribe();
    }

    styleProperties(): ViewProperty[] {
        return super.styleProperties().concat(this.props.parentView.activePropertiesNamed('alignment'));
    }

    styleValue(props: ViewProperty[], value: any[]): React.CSSProperties {
        const r = super.styleValue(props, value);
        r.flexDirection = 'row';
        r.justifyContent = 'stretch';
        r.display = 'flex';

        const index = props.findIndex(p => p.name === 'alignment');
        if (index >= 0) {
            switch (value[index]) {
                case 'center':
                    r.alignItems = 'center';
                    break;
                case 'baseline':
                    r.alignItems = 'baseline';
                    break;

                case 'top':
                    r.alignItems = 'flex-start';
                    break;
                case  'bottom':
                    r.alignItems = 'flex-end';
                    break;
                case 'fill':
                default:
                    r.alignItems = 'stretch';
                    break;
            }
        }

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
                    width: maxWidth + this.state.spacing * (sizes.length - 1),
                    height: maxHeight
                };
            })
        );
    }

    protected spacerStyle(): CSSProperties {
        return {width: this.state.spacing + 'px'}
    }
}

export class ReactVerticalLayout extends ReactLinearLayout {

    protected subviewSubscription: Subscription = new Subscription();

    componentWillUnmount(): void {
        super.componentWillUnmount();
        this.subviewSubscription.unsubscribe();
    }

    styleProperties(): ViewProperty[] {
        return super.styleProperties().concat(this.props.parentView.activePropertiesNamed('alignment'));
    }

    styleValue(props: ViewProperty[], value: any[]): React.CSSProperties {
        const r = super.styleValue(props, value);
        r.flexDirection = 'column';
        r.justifyContent = 'stretch';
        r.display = 'flex';

        const index = props.findIndex(p => p.name === 'alignment');
        if (index >= 0) {
            switch (value[index]) {
                case 'center':
                    r.alignItems = 'center';
                    break;
                case 'baseline':
                    r.alignItems = 'baseline';
                    break;

                case 'leading':
                    r.alignItems = 'flex-start';
                    break;
                case  'trailing':
                    r.alignItems = 'flex-end';
                    break;
                case 'fill':
                default:
                    r.alignItems = 'stretch';
                    break;
            }
        }

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
                    height: maxHeight + this.state.spacing * (sizes.length - 1)
                };
            })
        );
    }

    protected spacerStyle(): CSSProperties {
        return {height: this.state.spacing + 'px'}
    }
}

export class ReactLayer extends ReactContainer {
    state: ReactContainerState = {
        aspect: null,
        childrenVisible: [],
        style: {
            width: '100%',
            height: '100%',
            position: 'absolute'
        }
    };

    styleProperties(): ViewProperty[] {
        return super.styleProperties().concat(this.props.parentView.activePropertiesNamed('z_order'));
    }

    styleValue(props: ViewProperty[], value: any[]): React.CSSProperties {
        const r = super.styleValue(props, value);
        let index = props.findIndex(x => x.name === 'z_order');
        if (index >= 0)
            r.zIndex = value[index];
        r.width = '100%';
        r.height = '100%';
        r.position = 'absolute';
        return r;
    }


    protected isWidthDefined(): boolean {
        return true;
    }

    protected isHeightDefined(): boolean {
        return true;
    }
}

export class ReactTopLayout extends ReactStackLayout {
    protected updateSubviewPositions(): void {
    }
}