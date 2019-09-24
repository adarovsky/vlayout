import {ReactContainer, ReactViewState} from "./react_views";
import {Container, ViewProperty} from "./view";
import React, {CSSProperties} from "react";
import {combineLatest} from "rxjs";
import {takeWhile} from "rxjs/operators";
import {resizeObserver} from "./resize_sensor";
import _ from "lodash";

class ReactLinearLayout extends ReactContainer {
    state: { spacing: number; style: CSSProperties, childrenVisible: boolean[] } = {
        style: {},
        spacing: 0,
        childrenVisible: []
    };

    componentDidMount(): void {
        super.componentDidMount();
        this.wire('spacing', 'spacing', _.identity);

        const props = (this.props.parentView as Container).views.map(v => v.property('alpha').value!.sink)

        this.subscription.add(combineLatest(props).subscribe( value => {
            this.setState(s => _.extend(s, {childrenVisible: value}));
        }));
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

        let index = props.findIndex(p => p.name === 'alignment');
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

        index = props.findIndex( p => p.name === 'alpha');
        if (index >= 0) {
            r.display = value[index] > 0 ? 'flex' : 'none';
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

        let index = props.findIndex(p => p.name === 'alignment');
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

        index = props.findIndex( p => p.name === 'alpha');
        if (index >= 0) {
            r.display = value[index] > 0 ? 'flex' : 'none';
        }

        return r;
    }

    protected spacerStyle(): CSSProperties {
        return {height: this.state.spacing + 'px'}
    }
}

export class ReactStackLayout extends ReactContainer {
    componentDidMount(): void {
        super.componentDidMount();

        let self = this.viewRef.current as HTMLElement;
        let container: HTMLElement[] = [self];
        let child = self.firstElementChild;
        while (child) {
            container.push(child as HTMLElement);
            child = child.nextElementSibling;
        }

        this.subscription.add(combineLatest(container.map(c => resizeObserver(c)))
            .pipe(takeWhile(() => !this.state.style.width || !this.state.style.height))
            .subscribe(sizes => {
                if (!this.state.style.width) {
                    let maxWidth = 0;
                    for (let i = 1; i < sizes.length; ++i) {
                        if (container[i].style.width !== null &&
                            !container[i].style.width!.endsWith('%') &&
                            maxWidth < sizes[i].width)
                            maxWidth = sizes[i].width;
                    }

                    if (maxWidth > 0) {
                        console.log(`updating stack width to ${maxWidth}`);
                        self.style.width = maxWidth + 'px';
                    }
                }

                if (!this.state.style.height) {
                    let maxHeight = 0;
                    for (let i = 1; i < sizes.length; ++i) {
                        if (container[i].style.height !== null &&
                            !container[i].style.height!.endsWith('%') &&
                            maxHeight < sizes[i].height)
                            maxHeight = sizes[i].height;
                    }

                    if (maxHeight > 0) {
                        console.log(`updating stack height to ${maxHeight}`);
                        self.style.height = maxHeight + 'px';
                    }
                }
                console.log(`update complete: ${self.style.width}`);
            }
        ));
    }

    styleValue(props: ViewProperty[], value: any[]): React.CSSProperties {
        const r = super.styleValue(props, value);
        r.position = 'relative';
        return r;
    }
}

export class ReactLayer extends ReactContainer {
    state: ReactViewState = {
        style: {
            width: '100%',
            height: '100%'
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
        return r;
    }
}