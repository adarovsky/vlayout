import {ReactContainer} from "./react_views";
import {ViewProperty} from "./view";
import React from "react";
import {combineLatest} from "rxjs";
import {takeWhile} from "rxjs/operators";
import {resizeObserver} from "./resize_sensor";

export class ReactHorizontalLayout extends ReactContainer {

    styleProperties(): ViewProperty[] {
        return super.styleProperties().concat(this.props.parentView.activePropertiesNamed('alignment'));
    }

    styleValue(props: ViewProperty[], value: any[]): React.CSSProperties {
        const r = super.styleValue(props, value);
        r.display = 'flex';
        r.flexDirection = 'row';
        r.justifyContent = 'stretch';

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
}

export class ReactVerticalLayout extends ReactContainer {
    styleProperties(): ViewProperty[] {
        return super.styleProperties().concat(this.props.parentView.activePropertiesNamed('alignment'));
    }


    styleValue(props: ViewProperty[], value: any[]): React.CSSProperties {
        const r = super.styleValue(props, value);
        r.display = 'flex';
        r.flexDirection = 'column';
        r.justifyContent = 'stretch';

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

    style(): React.CSSProperties {
        const r = super.style();
        r.width = '100%';
        r.height = '100%';
        return r;
    }
}