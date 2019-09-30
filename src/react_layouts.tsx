import {ReactContainer, ReactContainerState, ReactView, ReactViewState} from "./react_views";
import {Container, ViewProperty} from "./view";
import React, {CSSProperties} from "react";
import {combineLatest, Subscription} from "rxjs";
import {takeWhile} from "rxjs/operators";
import {resizeObserver} from "./resize_sensor";
import _ from "lodash";

class ReactLinearLayout extends ReactContainer {
    state = {
        spacing: 0,
        style: {},
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

    protected spacerStyle(): CSSProperties {
        return {width: this.state.spacing + 'px'}
    }
}

export class ReactVerticalLayout extends ReactLinearLayout {
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

    protected spacerStyle(): CSSProperties {
        return {height: this.state.spacing + 'px'}
    }
}

export class ReactStackLayout extends ReactContainer {
    protected subviewSubscription: Subscription = new Subscription();

    componentWillUnmount(): void {
        super.componentWillUnmount();
        this.subviewSubscription.unsubscribe();
    }

    protected updateSubviewPositions(): void {
        let self = this.viewRef.current as HTMLElement;
        let container: HTMLElement[] = [self];
        let child = self.firstElementChild;
        while (child) {
            container.push(child as HTMLElement);
            child = child.nextElementSibling;
        }

        this.subviewSubscription.unsubscribe();
        this.subviewSubscription = combineLatest(container.map(c => resizeObserver(c)))
            // .pipe(takeWhile(() => !this.state.style.width || !this.state.style.height))
            .subscribe(sizes => {
                console.log("sizes:", sizes);
                    if (!this.state.style.width) {
                        let maxWidth = 0;

                        React.Children.forEach(this.props.children, child1 => {
                            if (child1 instanceof ReactView) {
                                maxWidth = Math.max(maxWidth, child1.intrinsicSize().width);
                            }
                        });

                        if (maxWidth > 0) {
                            console.log(`updating stack width to ${maxWidth}`);
                            self.style.width = maxWidth + 'px';
                        }
                    }

                    if (!this.state.style.height) {
                        let maxHeight = 0;
                        React.Children.forEach(this.props.children, child1 => {
                            if (child1 instanceof ReactView) {
                                maxHeight = Math.max(maxHeight, child1.intrinsicSize().height);
                            }
                        });


                        if (maxHeight > 0) {
                            console.log(`updating stack height to ${maxHeight}`);
                            self.style.height = maxHeight + 'px';
                        }
                    }
                    console.log(`update complete: ${self.style.width}`);
                }
            );
    }

    styleValue(props: ViewProperty[], value: any[]): React.CSSProperties {
        const r = super.styleValue(props, value);
        r.position = 'relative';
        return r;
    }
}

export class ReactLayer extends ReactContainer {
    state: ReactContainerState = {
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