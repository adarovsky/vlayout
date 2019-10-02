import {ReactContainer, ReactContainerState, ReactView, ReactViewProps, ReactViewState} from "./react_views";
import {Container, ViewProperty} from "./view";
import React, {CSSProperties} from "react";
import _ from "lodash";
import {ReactStackLayout} from "./react_stack";
import {combineLatest, Subscription} from "rxjs";

class ReactLinearLayout extends ReactContainer {
    state = {
        spacing: 0,
        aspect: null,
        style: {} as CSSProperties,
        childrenVisible: []
    };

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

    protected updateSubviewPositions(): void {

        const self = this.viewRef.current;
        if (!self) return;

        const children = (this.props.parentView as Container).views
            .map(v => v.instance)
            .filter(v => v !== null) as ReactView<ReactViewProps, ReactViewState>[];

        this.subviewSubscription.unsubscribe();
        this.subviewSubscription = combineLatest(children.map(c => c.intrinsicSize()))
            .subscribe(sizes => {
                    console.log("sizes:", sizes);
                    if (!this.isHeightDefined()) {
                        let maxHeight = 0;

                        sizes.forEach((size) => {
                            maxHeight = Math.max(maxHeight, size.height);
                        });

                        if (maxHeight > 0) {
                            console.log(`updating horizontal layout height to ${maxHeight}`);
                            self.style.height = maxHeight + 'px';
                        }
                    }

                    if (!this.isWidthDefined()) {
                        let maxWidth = 0;

                        sizes.forEach((size) => {
                            maxWidth = Math.max(maxWidth, size.width);
                        });

                        if (maxWidth > 0) {
                            self.style.width = maxWidth + this.state.spacing * (this.state.childrenVisible.length - 1) + 'px';
                            console.log(`updating horizontal layout width to ${self.style.width}`);
                        }
                    }
                }
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

    protected updateSubviewPositions(): void {

        const self = this.viewRef.current;
        if (!self) return;

        const children = (this.props.parentView as Container).views
            .map(v => v.instance)
            .filter(v => v !== null) as ReactView<ReactViewProps, ReactViewState>[];

        this.subviewSubscription.unsubscribe();
        this.subviewSubscription = combineLatest(children.map(c => c.intrinsicSize()))
            .subscribe(sizes => {
                    console.log("sizes:", sizes);
                    if (!this.isWidthDefined()) {
                        let maxWidth = 0;

                        sizes.forEach((size, index) => {
                            const child = children[index];
                            maxWidth = Math.max(maxWidth, size.width);
                            let match;
                            if (typeof child.state.style.left === 'string' && (match = child.state.style.left.match(/(\d+)px/))) {
                                maxWidth += +match[1];
                            }
                            if (typeof child.state.style.right === 'string' && (match = child.state.style.right.match(/(\d+)px/))) {
                                maxWidth += +match[1];
                            }
                        });

                        if (maxWidth > 0) {
                            console.log(`updating vertical layout width to ${maxWidth}`);
                            self.style.width = maxWidth + 'px';
                        }
                    }

                    if (!this.isHeightDefined()) {
                        let maxHeight = 0;

                        sizes.forEach((size) => {
                            maxHeight = Math.max(maxHeight, size.height);
                        });

                        if (maxHeight > 0) {
                            self.style.height = maxHeight + this.state.spacing * (this.state.childrenVisible.length - 1) + 'px';
                            console.log(`updating horizontal layout width to ${self.style.height}`);
                        }
                    }
                }
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
}

export class ReactTopLayout extends ReactStackLayout {
    protected updateSubviewPositions(): void {
    }
}