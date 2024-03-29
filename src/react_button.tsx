import { ViewProperty } from './view';
import { combineLatest, from, Observable, of } from 'rxjs';
import React, { CSSProperties } from 'react';
import { cloneDeep, isEqual, pick } from 'lodash';
import { ReactRoundRect } from './react_primitives';
import { FontContainer, ImageContainer } from './types';
import { distinctUntilChanged, map, switchMap } from 'rxjs/operators';
import { Button } from './primitives';
import { ReactViewProps, ReactViewState } from './react_views';
import ReactTooltipComponent from 'react-tooltip';
import composeRefs from '@seznam/compose-react-refs';

export interface ReactButtonState extends ReactViewState {
    imageSrc?: string;
    imageSrcSet?: string;
    text: string;
    imageStyle: CSSProperties;
    imagePosition: string;
    running: boolean;
    enabled: boolean;
}

export class ReactButtonBase<
    S extends ReactButtonState = ReactButtonState
> extends ReactRoundRect<S> {
    constructor(props: ReactViewProps) {
        super(props);
        this.state = {
            ...this.state,
            text: '',
            imageStyle: {
                maxHeight: '100%',
                maxWidth: '100%',
                objectFit: 'scale-down',
            },
            imagePosition: 'leftToText',
            running: false,
            enabled: true,
        };
    }

    public styleProperties(): ViewProperty[] {
        const sup = super.styleProperties();
        return sup.concat(
            this.props.parentView.activePropertiesNamed(
                'textColor',
                'font',
                'imagePosition',
                'contentPadding.left',
                'contentPadding.top',
                'contentPadding.right',
                'contentPadding.bottom'
            )
        );
    }

    componentDidMount(): void {
        super.componentDidMount();

        this.wire('text', 'text', (x) => x);
        this.wire('image', 'imageSrc', (image: ImageContainer) => image?.src);
        this.wire('enabled', 'enabled', (x) => x);

        const paddingProp = this.props.parentView.property('imagePadding');
        const imagePositionProp = this.props.parentView.property(
            'imagePosition'
        );
        const image = this.props.parentView.property('image');
        const text = this.props.parentView.property('text');

        if (image.value) {
            this.subscription.add(
                image.value.sink
                    .pipe(
                        switchMap((image: ImageContainer) => image.srcSet()),
                        distinctUntilChanged()
                    )
                    .subscribe((srcSet) => {
                        this.logValue('imageSrcSet', srcSet);
                        this.setState({ imageSrcSet: srcSet });
                    })
            );
        }

        if (image.value && text.value) {
            this.subscription.add(
                combineLatest([
                    paddingProp.value?.sink ?? of(null),
                    imagePositionProp.value!.sink,
                    image.value.sink as Observable<ImageContainer | null>,
                    text.value.sink as Observable<string>,
                ])
                    .pipe(
                        map(([padding, imagePosition, image, text]) => {
                            const r: CSSProperties = {};
                            if (!!image?.src && !!text) {
                                switch (imagePosition) {
                                    case 'left':
                                    case 'leftToText':
                                        if (padding !== null)
                                            r.marginRight = padding;
                                        break;
                                    case 'right':
                                    case 'rightToText':
                                        if (padding !== null)
                                            r.marginLeft = padding;
                                        break;
                                    case 'top':
                                        if (padding !== null)
                                            r.marginBottom = padding;
                                        r.minHeight = '0px';
                                        r.flexShrink = 1;
                                        r.flexGrow = 1;
                                        break;
                                    case 'bottom':
                                        if (padding !== null)
                                            r.marginTop = padding;
                                        r.minHeight = '0px';
                                        r.flexShrink = 1;
                                        r.flexGrow = 1;
                                        break;
                                }
                            }
                            r.maxHeight = '100%';
                            r.maxWidth = '100%';
                            r.objectFit = 'scale-down';
                            return r;
                        })
                    )
                    .pipe(distinctUntilChanged((x, y) => isEqual(x, y)))
                    .subscribe((x) => {
                        this.logValue('imageStyle', x);
                        this.setState((s) => ({ ...s, imageStyle: x }));
                    })
            );
        }

        this.subscription.add(
            imagePositionProp
                .value!.sink.pipe(distinctUntilChanged((x, y) => isEqual(x, y)))
                .subscribe((pos) => {
                    this.logValue('imagePosition', pos);
                    this.setState((s) => ({ ...s, imagePosition: pos }));
                })
        );

        const paddings = this.props.parentView.activePropertiesNamed(
            'contentPadding.left',
            'contentPadding.top',
            'contentPadding.right',
            'contentPadding.bottom'
        );

        if (paddings.length === 0) {
            this.subscription.add(
                combineLatest([
                    this.cornerRadiusWatcher,
                    this.viewRef,
                ]).subscribe(([[size, radius], self]) => {
                    if (size.width > 0 && radius <= 0.5) {
                        self.style.paddingRight = self.style.paddingLeft = `${Math.max(
                            10,
                            (size.height * radius) / 2
                        )}px`;
                    }
                })
            );
        }
    }

    styleValue(props: ViewProperty[], value: any[]): React.CSSProperties {
        const r = super.styleValue(props, value);
        let imagePosition = 'leftToText';

        r.display = 'flex';
        r.cursor = 'pointer';
        value.forEach((val, index) => {
            switch (props[index].name) {
                case 'textColor':
                    if (val) {
                        r.color = val.toString();
                    }
                    break;
                case 'contentPadding.left':
                    r.paddingLeft = `${val}px`;
                    break;
                case 'contentPadding.right':
                    r.paddingRight = `${val}px`;
                    break;
                case 'contentPadding.top':
                    r.paddingTop = `${val}px`;
                    break;
                case 'contentPadding.bottom':
                    r.paddingBottom = `${val}px`;
                    break;
                case 'font':
                    const c = val as FontContainer;
                    if (c?.familyName) r.fontFamily = c.familyName;
                    switch (c?.type) {
                        case 'bold':
                            r.fontWeight = 'bold';
                            break;
                        case 'italic':
                            r.fontStyle = 'italic';
                            break;
                    }
                    if (c?.size) {
                        r.fontSize = `${c.size}px`;
                    }
                    break;
                case 'imagePosition':
                    imagePosition = val;
                    break;
                case 'alpha':
                    r.display = val > 0 ? 'flex' : 'none';
                    break;
            }
        });

        r.alignItems = 'center';
        r.textDecoration = 'none';

        switch (imagePosition) {
            case 'left':
                r.flexDirection = 'row';
                r.justifyContent = 'stretch';
                break;
            case 'leftToText':
                r.flexDirection = 'row';
                r.justifyContent = 'center';
                break;
            case 'right':
                r.flexDirection = 'row-reverse';
                r.justifyContent = 'stretch';
                break;
            case 'rightToText':
                r.flexDirection = 'row-reverse';
                r.justifyContent = 'center';
                break;
            case 'top':
                r.flexDirection = 'column';
                r.justifyContent = 'center';
                break;
            case 'bottom':
                r.flexDirection = 'column-reverse';
                r.justifyContent = 'center';
                break;
        }

        return r;
    }

    private currentStyle(): CSSProperties {
        const s = cloneDeep(this.state.style);
        if (this.state.running) {
            s.cursor = 'progress';
            s.pointerEvents = 'none';
        } else if (!this.state.enabled) {
            s.cursor = 'not-allowed';
            s.pointerEvents = 'none';
        } else {
            s.pointerEvents = 'auto';
        }
        return s;
    }

    protected handleClick(
        e: React.MouseEvent<HTMLDivElement, MouseEvent>
    ): void {}

    protected isWidthDefined(): boolean {
        return true;
    }

    protected isHeightDefined(): boolean {
        return true;
    }

    getClassName(): string {
        let name = super.getClassName();
        return (
            name +
            (this.state.running || !this.state.enabled ? ' disabled' : '')
        );
    }

    render() {
        const pos = this.state.imagePosition;
        const text =
            this.state.text &&
            this.state.text.split('\n').map(function (item, key) {
                return (
                    <span key={key}>
                        {item}
                        <br />
                    </span>
                );
            });
        const decorated =
            this.state.text && (pos === 'left' || pos === 'right') ? (
                <>
                    <span style={{ textAlign: 'center', flexGrow: 1 }}>
                        {text}
                    </span>
                    {this.state.imageSrc && (
                        <img
                            src={this.state.imageSrc}
                            srcSet={this.state.imageSrcSet}
                            style={{ ...this.state.imageStyle, opacity: 0 }}
                            alt={this.state.text}
                        />
                    )}
                </>
            ) : (
                text
            );

        const extra = pick(this.state, 'id') as any;

        return (
            <div
                {...extra}
                style={this.currentStyle()}
                className={this.className}
                ref={composeRefs(this.setViewRef, this.props.innerRef)}
                onClick={(e) => this.handleClick(e)}
            >
                {this.state.imageSrc && (
                    <img
                        src={this.state.imageSrc}
                        srcSet={this.state.imageSrcSet}
                        style={this.state.imageStyle}
                        alt={this.state.text}
                    />
                )}
                {decorated}
            </div>
        );
    }
}

export class ReactButton extends ReactButtonBase {
    protected handleClick(
        e: React.MouseEvent<HTMLDivElement, MouseEvent>
    ): void {
        if (this.state.running) return;
        e.preventDefault();
        e.stopPropagation();
        this.logValue('running', true);
        this.setState((s) => ({ ...s, running: true }));
        const promise = (this.props.parentView as Button).onClick();
        this.subscription.add(
            from(promise).subscribe({
                error: () => {
                    this.logValue('running', false);
                    this.setState((s) => {
                        return { ...s, running: false };
                    });
                },
                complete: () => {
                    this.logValue('running', false);
                    this.setState((s) => {
                        return { ...s, running: false };
                    });
                },
            })
        );
    }
}
