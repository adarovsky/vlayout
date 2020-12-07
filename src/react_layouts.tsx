import {
    ReactContainer,
    ReactContainerState,
    ReactView,
    ReactViewProps,
    ReactViewState,
} from './react_views';
import { Container, ViewProperty } from './view';
import React, { CSSProperties } from 'react';
import { ReactStackLayout } from './react_stack';
import { fromEvent, Observable } from 'rxjs';
import { ElementSize } from './resize_sensor';
import { map, startWith } from 'rxjs/operators';
import ReactDOM from 'react-dom';
import { identity, pick } from 'lodash';
import { visibleChildrenSizes } from './react_absolute';
import { isNotNull } from './utils';

class ReactLinearLayout extends ReactContainer<
    ReactContainerState & { spacing: number; alignment: string }
> {
    constructor(props: ReactViewProps) {
        super(props);
        this.state = { ...this.state, spacing: 0, alignment: 'fill' };
    }

    componentDidMount(): void {
        super.componentDidMount();
        this.wire('spacing', 'spacing', identity);
        this.wire('alignment', 'alignment', identity);
    }

    render() {
        const extra = pick(this.state, 'id');
        return (
            <div
                style={this.style()}
                className={this.className}
                ref={this.setViewRef}
                {...extra}
            >
                {(this.props.parentView as Container).views
                    .filter((v, index) => this.state.childrenVisible[index])
                    .flatMap((v, index) => {
                        const result = [v.target];
                        if (index > 0 && this.state.spacing)
                            result.unshift(
                                <div style={this.spacerStyle()} key={index} />
                            );
                        return result;
                    })}
            </div>
        );
    }

    protected spacerStyle(): CSSProperties {
        return { width: this.state.spacing + 'px' };
    }
}

export class ReactHorizontalLayout extends ReactLinearLayout {
    styleProperties(): ViewProperty[] {
        return super
            .styleProperties()
            .concat(this.props.parentView.activePropertiesNamed('alignment'));
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
                case 'bottom':
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
            visibleChildrenSizes(),
            map(sizes => {
                let maxHeight = 0;
                let maxWidth = 0;

                sizes.forEach(size => {
                    maxHeight = Math.max(maxHeight, size.height);
                    maxWidth += size.width;
                });

                return {
                    width: maxWidth + this.state.spacing * (sizes.length - 1),
                    height: maxHeight,
                };
            })
        );
    }

    definesChildWidth(
        child: ReactView<ReactViewProps, ReactViewState>
    ): boolean {
        return child.state.sizePolicy === 'stretched' && this.isWidthDefined();
    }

    definesChildHeight(
        child: ReactView<ReactViewProps, ReactViewState>
    ): boolean {
        return this.isHeightDefined();
    }

    protected spacerStyle(): CSSProperties {
        return { width: this.state.spacing + 'px' };
    }
}

export class ReactVerticalLayout extends ReactLinearLayout {
    styleProperties(): ViewProperty[] {
        return super
            .styleProperties()
            .concat(this.props.parentView.activePropertiesNamed('alignment'));
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
                case 'trailing':
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
            visibleChildrenSizes(),
            map(sizes => {
                let maxHeight = 0;
                let maxWidth = 0;

                sizes.forEach(size => {
                    maxHeight += size.height;
                    maxWidth = Math.max(maxWidth, size.width);
                });

                return {
                    width: maxWidth,
                    height: maxHeight + this.state.spacing * (sizes.length - 1),
                };
            })
        );
    }

    definesChildWidth(
        child: ReactView<ReactViewProps, ReactViewState>
    ): boolean {
        return this.isWidthDefined();
    }

    definesChildHeight(
        child: ReactView<ReactViewProps, ReactViewState>
    ): boolean {
        return child.state.sizePolicy === 'stretched' && this.isHeightDefined();
    }

    protected spacerStyle(): CSSProperties {
        return { height: this.state.spacing + 'px' };
    }
}

export class ReactLayer extends ReactContainer<
    ReactContainerState & { fullscreen: boolean }
> {
    constructor(props: ReactViewProps) {
        super(props);
        this.state = {
            ...this.state,
            style: {
                width: '100%',
                height: '100%',
                position: 'absolute',
            },
            fullscreen: false,
        };
    }

    private static ensureModalExists(): HTMLElement {
        const e = document.getElementById('vlayout_modal');
        if (e) {
            return e;
        } else {
            const modal = document.createElement('div');
            modal.setAttribute('id', 'vlayout_modal');
            document.body.appendChild(modal);
            fromEvent(window, 'resize')
                .pipe(
                    startWith(null),
                    map(
                        () =>
                            (document &&
                                document.documentElement &&
                                document.documentElement.clientHeight) ||
                            window.innerHeight
                    )
                )
                .subscribe(height => (modal.style.height = `${height}px`));
            return modal;
        }
    }

    styleProperties(): ViewProperty[] {
        return super
            .styleProperties()
            .concat(this.props.parentView.activePropertiesNamed('z_order'));
    }

    styleValue(props: ViewProperty[], value: any[]): React.CSSProperties {
        const r = super.styleValue(props, value);
        let index = props.findIndex(x => x.name === 'z_order');
        if (index >= 0) r.zIndex = value[index];
        r.width = '100%';
        r.height = '100%';
        r.position = 'absolute';
        return r;
    }

    componentDidMount(): void {
        super.componentDidMount();
        const value = this.props.parentView.property('fullscreen').value;
        if (value) {
            this.subscription.add(
                value.sink.subscribe((fs: boolean) => {
                    this.setState(s => ({ ...s, fullscreen: fs }));
                })
            );
        }
    }

    protected isWidthDefined(): boolean {
        return true;
    }

    protected isHeightDefined(): boolean {
        return true;
    }

    definesChildWidth(
        child: ReactView<ReactViewProps, ReactViewState>,
    ): boolean {
        // console.log('isWidthDefined(', this._viewRef.value, ', child state:', child.state, ') = ', this.isWidthDefined());
        return this.isWidthDefined() &&
            (isNotNull(child.state.size?.width) || (isNotNull(child.state.padding?.left) && isNotNull(child.state.padding?.right)));
    }

    definesChildHeight(
        child: ReactView<ReactViewProps, ReactViewState>,
    ): boolean {
        return this.isHeightDefined() &&
            (isNotNull(child.state.size?.height) || (isNotNull(child.state.padding?.top) && isNotNull(child.state.padding?.bottom)));
    }

    render() {
        const extra = pick(this.state, 'id');
        const content = (
            <div
                style={this.style()}
                className={this.className}
                ref={this.setViewRef}
                {...extra}
            >
                {(this.props.parentView as Container).views
                    .filter((v, index) => this.state.childrenVisible[index])
                    .map(v => v.target)}
            </div>
        );
        return this.state.fullscreen
            ? ReactDOM.createPortal(content, ReactLayer.ensureModalExists())
            : content;
    }
}

export class ReactTopLayout extends ReactStackLayout {
    protected isWidthDefined(): boolean {
        return true;
    }

    protected isHeightDefined(): boolean {
        return true;
    }
}
