import React, { CSSProperties } from 'react';
import { cloneDeep, forEach, identity, isEqual, pick } from 'lodash';
import { ViewProperty } from './view';
import { ColorContainer, FontContainer, ImageContainer } from './types';
import { ReactView, ReactViewProps, ReactViewState } from './react_views';
import { BehaviorSubject, combineLatest, Observable, of } from 'rxjs';
import { distinctUntilChanged, filter, shareReplay, startWith, switchMap } from 'rxjs/operators';
import { ElementSize, resizeObserver } from './resize_sensor';
import deleteProperty = Reflect.deleteProperty;

interface ReactLabelState extends ReactViewState {
    style: CSSProperties;
    text: string|null;
    maxLines: number;
}

export class ReactLabel extends ReactView<ReactViewProps, ReactLabelState> {
    readonly _shadowRef = new BehaviorSubject<HTMLDivElement|null>(null);
    setShadowRef(e: HTMLDivElement|null) {
        if (e) this._shadowRef.next(e);
    }
    get shadowRef() {
        return this._shadowRef.pipe(filter(x => x !== null)) as Observable<HTMLDivElement>;
    }

    constructor(props: ReactViewProps) {
        super(props);
        this.state = {...this.state,
            text: null,
            maxLines: 0
        }

        this.setShadowRef = this.setShadowRef.bind(this);
    }

    componentDidMount(): void {
        super.componentDidMount();
        this.wire('text', 'text', identity);
        this.wire('maxLines', 'maxLines', identity);
    }

    styleProperties(): ViewProperty[] {
        return super.styleProperties().concat(this.props.parentView.activePropertiesNamed('maxLines', 'textColor', 'font', 'textAlignment'));
    }

    styleValue(props: ViewProperty[], value: any[]): React.CSSProperties {
        const r = super.styleValue(props, value);
        let maxLines = 0;
        forEach(value, (val, index) => {
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
                case 'maxLines':
                    maxLines = +val;
                    break;
            }
        });

        r.overflow = 'hidden';
        r.textOverflow = 'ellipsis';
        return r;
    }

    render() {
        const extra = pick(this.state, 'id');
        const text = this.state.text ?? 'placeholder';
        const content = this.state.maxLines === 1 ?
            <span style={{whiteSpace: 'nowrap'}}>{text}</span>
            : text.split('\n').map(function (item, key) {
            return <span key={key}>{item}<br/></span>;
        });

        return (<div style={this.style()} className={this.className} ref={this.setViewRef} {...extra}>
            {this.state.text === null ? <div className={'vlayout_placeholder'}/> : content}
            <div style={this.shadowStyle()} key='shadow' className={'vlayout_'+this.props.parentView.viewType()+'_shadow'} ref={this.setShadowRef}>
                {content}
            </div>
        </div>);
    }

    private shadowStyle(): CSSProperties {
        const r = cloneDeep(this.style());
        for (let t of ['width', 'height', 'top', 'bottom', 'left', 'right']) {
            deleteProperty(r, t);
        }

        r.position = 'absolute';
        r.whiteSpace = 'pre';
        r.opacity = 0;
        return r;
    }

    intrinsicSize(): Observable<ElementSize> {
        return this.shadowRef.pipe(
            switchMap(self => resizeObserver(self)),
            startWith({width: 0, height: 0}),
            distinctUntilChanged(isEqual)
        );
    }

    protected isWidthDefined(): boolean {
        return false;
    }

    protected isHeightDefined(): boolean {
        return false;
    }
}

interface ReactImageState extends ReactViewState {
    image: ImageContainer;
    innerStyle: CSSProperties;
}

export class ReactImage extends ReactView<ReactViewProps, ReactImageState> {

    constructor(props: ReactViewProps) {
        super(props);
        this.state = {...this.state,
            image: new ImageContainer(''),
            innerStyle: { width: '100%', height: '100%', objectFit: 'fill' }
        }
    }

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
        const extra = pick(this.state, 'id');
        return (<div style={this.style()} ref={this.setViewRef} className={this.className} {...extra}>
            <img style={this.state.innerStyle}
                 src={this.state.image.src}
                 alt=""/>
        </div>);
    }

    protected isWidthDefined(): boolean {
        return true;
    }

    protected isHeightDefined(): boolean {
        return true;
    }
}

export class ReactGradient extends ReactView<ReactViewProps, ReactViewState> {

    public styleProperties(): ViewProperty[] {
        const sup = super.styleProperties();
        return sup.concat(this.props.parentView.activePropertiesNamed('startColor', 'endColor', 'orientation'));
    }

    styleValue(props: ViewProperty[], value: any[]): React.CSSProperties {
        const r = super.styleValue(props, value);
        let startColor = new ColorContainer(0, 0, 0),
            endColor = new ColorContainer(0, 0, 0),
            orientation: string = '270deg';
        forEach(value, (val, index) => {
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

export class ReactRoundRect<S extends ReactViewState = ReactViewState> extends ReactView<ReactViewProps, S> {

    protected _cornerRadiusWatcher: Observable<[ElementSize, number]>|null = null;

    get cornerRadiusWatcher(): Observable<[ElementSize, number]> {
        if (!this._cornerRadiusWatcher) {
            const p = this.props.parentView.property('cornerRadius');
            if (p.value) {
                this._cornerRadiusWatcher = combineLatest([this.intrinsicSize(), p.value.sink as Observable<number>]).pipe(
                    shareReplay({refCount: true, bufferSize: 1})
                );
                return this._cornerRadiusWatcher;
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
            this.subscription.add(combineLatest([this.cornerRadiusWatcher, this.viewRef]).subscribe(
                ([x, self])=> {
                if (x[1] <= 0.5) {
                    self.style.borderRadius = Math.min(x[0].width, x[0].height) * x[1] + 'px';
                }
            }));
        }
    }

    styleValue(props: ViewProperty[], value: any[]): React.CSSProperties {
        const r = super.styleValue(props, value);
        forEach(value, (val, index) => {
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

interface ReactProgressState extends ReactViewState{
    progressColor: string;
    style: CSSProperties;
}

export class ReactProgress extends ReactView<ReactViewProps, ReactProgressState> {

    constructor(props: ReactViewProps) {
        super(props);
        this.state = {...this.state,
            progressColor: '#ffffff'
        }
    }

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
        const extra = pick(this.state, 'id');
        return (<div style={this.style()} ref={this.setViewRef} className={this.className} {...extra}>
            <svg className="vlayout_spinner" viewBox="0 0 50 50">
                <circle className="path" cx="50%" cy="50%" r="40%" fill="none" strokeWidth="2" stroke={this.state.progressColor}/>
            </svg>
            </div>);
    }
}

export function fontStyle(font: FontContainer): CSSProperties {
    const r: CSSProperties = {};
    if (font.familyName)
        r.fontFamily = font.familyName;
    switch (font.type) {
        case 'bold':
            r.fontWeight = 'bold';
            break;
        case 'italic':
            r.fontStyle = 'italic';
            break;
    }
    if (font.size) {
        r.fontSize = `${font.size}px`;
    }

    return r;
}
