import React, {CSSProperties} from "react";
import _ from "lodash";
import {ViewProperty} from "./view";
import {ColorContainer, FontContainer, ImageContainer} from "./types";
import {ReactView, ReactViewState} from "./react_views";
import {combineLatest, Observable, of} from "rxjs";
import {shareReplay} from "rxjs/operators";
import {ElementSize, resizeObserver} from "./resize_sensor";

interface ReactLabelState {
    style: CSSProperties;
    text: string;
    maxLines: number;
}

export class ReactLabel extends ReactView<ReactLabelState> {
    state: ReactLabelState = {
        style: {},
        text: '',
        maxLines: 0
    };

    componentDidMount(): void {
        super.componentDidMount();
        this.wire('text', 'text', _.identity);
        this.wire('maxLines', 'maxLines', _.identity);
    }

    styleProperties(): ViewProperty[] {
        return super.styleProperties().concat(this.props.parentView.activePropertiesNamed('textColor', 'font', 'textAlignment'));
    }

    styleValue(props: ViewProperty[], value: any[]): React.CSSProperties {
        const r = super.styleValue(props, value);
        _.forEach(value, (val, index) => {
            switch (props[index].name) {
                case 'textColor':
                    r.color = val.toString();
                    break;
                case 'textAlignment':
                    switch (val) {
                        case 'left':
                            r.textAlign = 'start';
                            break;
                        case 'right':
                            r.textAlign = 'end';
                            break;
                        case 'center':
                            r.textAlign = 'center';
                            break;
                        case 'top':
                        case 'bottom':
                        case 'middle':
                            r.verticalAlign = val;
                            break;
                    }
                    break;
                case 'font':
                    const c = val as FontContainer;
                    if (c.familyName)
                        r.fontFamily = c.familyName;
                    switch (c.type) {
                        case 'bold':
                            r.fontWeight = 'bold';
                            break;
                        case 'italic':
                            r.fontStyle = 'italic';
                            break;
                    }
                    if (c.size) {
                        r.fontSize = `${c.size}px`;
                    }
                    break;
            }
        });
        return r;
    }

    render(): React.ReactElement<any, string | React.JSXElementConstructor<any>> | string | number | {} | React.ReactNodeArray | React.ReactPortal | boolean | null | undefined {
        // @ts-ignore
        return (<div style={this.style()} className={'vlayout_'+this.props.parentView.viewType()} ref={this.viewRef}>
            {this.state.text.split('\n').map(function(item, key) {
                    return (
                        <span key={key}>
                            {item}
                            <br/>
                            </span>
                    )
                })}
            </div>);
    }
}

export class ReactImage extends ReactView<{ image: ImageContainer; style: CSSProperties; innerStyle: CSSProperties;}> {
    state: { image: ImageContainer; style: {}; innerStyle: CSSProperties;} = {
        style: {},
        image: new ImageContainer(''),
        innerStyle: { width: '100%', height: '100%' }
    };

    componentDidMount(): void {
        super.componentDidMount();
        this.wire('image', 'image', v => v);
        this.wire('contentPolicy', 'innerStyle', v => {
            const s: CSSProperties = { width: '100%', height: '100%' };

            switch (v) {
                case 'aspectFit':
                    s.objectFit = 'scale-down';
                    break;
                case 'aspectFill':
                    s.objectFit = 'cover';
                    break;
                case 'center':
                    s.objectFit = 'none';
                    break;
                default:
                    s.objectFit = 'fill';
            }

            return s;
        });
    }

    render(): React.ReactElement<any, string | React.JSXElementConstructor<any>> | string | number | {} | React.ReactNodeArray | React.ReactPortal | boolean | null | undefined {
        // @ts-ignore
        return (<div style={this.style()} ref={this.viewRef} className={'vlayout_'+this.props.parentView.viewType()}>
            <img style={this.state.innerStyle}
                 src={this.state.image.src}
                 alt=""/>
        </div>);
    }
}

export class ReactGradient extends ReactView<ReactViewState> {

    public styleProperties(): ViewProperty[] {
        const sup = super.styleProperties();
        return sup.concat(this.props.parentView.activePropertiesNamed('startColor', 'endColor', 'orientation'));
    }

    styleValue(props: ViewProperty[], value: any[]): React.CSSProperties {
        const r = super.styleValue(props, value);
        let startColor = new ColorContainer(0, 0, 0),
            endColor = new ColorContainer(0, 0, 0),
            orientation: string = '270deg';
        _.forEach(value, (val, index) => {
            switch (props[index].name) {
                case 'startColor':
                    startColor = val;
                    break;
                case 'endColor':
                    endColor = val;
                    break;
                case 'orientation':
                    switch (val) {
                        case 'topToBottom':
                            orientation = '180deg';
                            break;
                        case 'bottomToTop':
                            orientation = '0deg';
                            break;
                        case 'leftToRight':
                            orientation = '90deg';
                            break;
                        default:
                            orientation = '270deg';
                            break;
                    }
                    break;
            }
        });

        r.background = `linear-gradient(${orientation}, ${startColor} 0%, ${endColor} 100%)`;

        return r;
    }
}

export class ReactRoundRect<S extends ReactViewState = ReactViewState> extends ReactView<S> {

    protected _cornerRadiusWatcher: Observable<[ElementSize, number]>|null = null;

    get cornerRadiusWatcher(): Observable<[ElementSize, number]> {
        if (!this._cornerRadiusWatcher) {
            const p = this.props.parentView.property('cornerRadius');
            if (p.value) {
                let self = this.viewRef.current as HTMLElement;
                this._cornerRadiusWatcher = combineLatest([resizeObserver(self), p.value.sink as Observable<number>]).pipe(
                    shareReplay({refCount: true, bufferSize: 1})
                );
            }
            else {
                this._cornerRadiusWatcher = of([{width: 0, height: 0}, 0]);
            }
        }
        return this._cornerRadiusWatcher;
    }

    public styleProperties(): ViewProperty[] {
        const sup = super.styleProperties();
        return sup.concat(this.props.parentView.activePropertiesNamed('strokeColor', 'strokeWidth', 'cornerRadius'));
    }

    componentDidMount(): void {
        super.componentDidMount();

        const p = this.props.parentView.property('cornerRadius');
        if (p.value) {
            let self = this.viewRef.current as HTMLElement;
            this.subscription.add(this.cornerRadiusWatcher.subscribe(x=> {
                if (x[1] <= 0.5) {
                    self.style.borderRadius = Math.min(x[0].width, x[0].height) * x[1] + 'px';
                }
            }));
        }
    }

        styleValue(props: ViewProperty[], value: any[]): React.CSSProperties {
        const r = super.styleValue(props, value);
        _.forEach(value, (val, index) => {
            switch (props[index].name) {
                case 'strokeColor':
                    r.borderColor = val.toString();
                    break;
                case 'strokeWidth':
                    if (val > 0) {
                        r.borderWidth = val;
                        r.borderStyle = 'solid';
                    }
                    break;
                case 'cornerRadius':
                    if (val > 0.5) {
                        r.borderRadius = `${val}px`;
                    }
                    break;
            }
        });
        r.boxSizing = 'border-box';

        return r;
    }
}

export class ReactProgress extends ReactView<{ progressColor: string; style: CSSProperties }> {
    state: { progressColor: string; style: CSSProperties } = {
        style: {},
        progressColor: '#ffffff'
    };

    componentDidMount(): void {
        super.componentDidMount();
        this.wire('color', 'progressColor', (x: ColorContainer) => x.toString())
    }

    styleValue(props: ViewProperty[], value: any[]): React.CSSProperties {
        const r = super.styleValue(props, value);
        if (!r.position || r.position === 'static')
            r.position = 'relative';

        return r;
    }

    render(): React.ReactElement<any, string | React.JSXElementConstructor<any>> | string | number | {} | React.ReactNodeArray | React.ReactPortal | boolean | null | undefined {
        // @ts-ignore
        return (<div style={this.style()} ref={this.viewRef} className={'vlayout_'+this.props.parentView.viewType()}>
            <svg className="vlayout_spinner" viewBox="0 0 50 50">
                <circle className="path" cx="50%" cy="50%" r="40%" fill="none" strokeWidth="2" stroke={this.state.progressColor}/>
            </svg>
            </div>);
    }
}