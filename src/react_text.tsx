import { ViewProperty } from './view';
import { BehaviorSubject, combineLatest, of } from 'rxjs';
import React, { CSSProperties } from 'react';
import { fontStyle, ReactRoundRect } from './react_primitives';
import { ColorContainer, Dictionary } from './types';
import { TextField } from './primitives';
import { ReactViewProps, ReactViewState } from './react_views';
import { extend, isEqual, omit, pick } from 'lodash';
import { distinctUntilChanged, filter, map } from 'rxjs/operators';
import { ElementSize } from './resize_sensor';
import composeRefs from '@seznam/compose-react-refs';

export interface ReactTextFieldState extends ReactViewState {
    text: string;
    placeholder: string;
    enabled: boolean;
    fontStyle: CSSProperties;
    colorStyle: CSSProperties;
    height: number;
    type: string;
    autoFocus: boolean;
}

export class ReactTextFieldBase<
    S extends ReactTextFieldState = ReactTextFieldState
> extends ReactRoundRect<S> {
    readonly inputRef = new BehaviorSubject<HTMLInputElement | null>(null);

    constructor(props: ReactViewProps) {
        super(props);
        this.state = {
            ...this.state,
            text: '',
            placeholder: '',
            enabled: true,
            fontStyle: {},
            colorStyle: {},
            height: 0,
            type: 'regular',
            autoFocus: false,
        };
    }

    public styleProperties(): ViewProperty[] {
        const sup = super.styleProperties();
        return sup.concat(
            this.props.parentView.activePropertiesNamed(
                'contentPadding.left',
                'contentPadding.top',
                'contentPadding.right',
                'contentPadding.bottom'
            )
        );
    }

    componentDidMount(): void {
        super.componentDidMount();

        const inputIsUpdating =
            this.props.parentView.scope?.engine.inputs.inputIsUpdating ??
            of(false as boolean);

        this.wire('text', 'text', (x) => x);
        this.wire('enabled', 'enabled', (x) => x);
        this.wire('font', 'fontStyle', fontStyle);
        this.wire('textColor', 'colorStyle', (x) => ({ color: x.toString() }));
        this.wire('type', 'type', (x) => x);
        this.wire('placeholder', 'placeholder', (x) => x);
        this.wire('autoFocus', 'autoFocus', (x) => x);
        const props = [
            inputIsUpdating,
            this.safeIntrinsicSize(),
            this.props.parentView.property('contentPadding.top').value?.sink ??
                of(0),
            this.props.parentView.property('contentPadding.bottom').value
                ?.sink ?? of(0),
            this.props.parentView.property('strokeWidth').value?.sink ?? of(0),
            this.props.parentView.property('strokeColor').value?.sink ??
                of(null),
        ];
        this.subscription.add(
            combineLatest(props)
                .pipe(
                    filter(([updating]) => !updating),
                    map(([, ...v]) => v),
                    distinctUntilChanged((x, y) => isEqual(x, y))
                )
                .subscribe((x) => {
                    if (super.isHeightDefined()) {
                        const size = x[0] as ElementSize;
                        const top = x[1] || (0 as number);
                        const bottom = x[2] || (0 as number);
                        const strokeWidth = x[3] || (0 as number);
                        const strokeColor = x[4] as ColorContainer | null;
                        const strokeOffset =
                            strokeWidth > 0 && strokeColor !== null
                                ? strokeWidth
                                : 0;
                        this.logValue(
                            'height',
                            size.height - top - bottom - strokeOffset * 2
                        );
                        this.setState((s) => ({
                            ...s,
                            height:
                                size.height - top - bottom - strokeOffset * 2,
                        }));
                    }
                })
        );

        const autoFocus = this.props.parentView.property('autoFocus').value
            ?.sink;
        if (autoFocus) {
            this.subscription.add(
                combineLatest([autoFocus, this.inputRef]).subscribe(
                    ([autoFocus, ref]) => {
                        if (autoFocus) {
                            ref?.focus();
                        }
                    }
                )
            );
        }
    }

    styleValue(props: ViewProperty[], value: any[]): React.CSSProperties {
        const r = super.styleValue(props, value);

        value.forEach((val, index) => {
            switch (props[index].name) {
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
                case 'alpha':
                    r.display = val > 0 ? undefined : 'none';
                    break;
            }
        });

        r.pointerEvents = 'auto';

        return r;
    }

    protected textEntered(e: string): void {}

    protected enterPressed(): void {}

    protected isHeightDefined(): boolean {
        return true;
    }

    private textFieldStyle(): CSSProperties {
        const r: CSSProperties = { minWidth: 0, width: '100%' };

        extend(r, this.state.fontStyle);
        extend(r, this.state.colorStyle);
        extend(
            r,
            pick(
                this.state.style,
                'borderColor',
                'borderStyle',
                'borderRadius',
                'paddingLeft',
                'paddingRight',
                'paddingTop',
                'paddingBottom'
            )
        );
        if (
            !this.state.style.borderColor &&
            !this.state.style.borderStyle &&
            !this.state.style.borderRadius
        ) {
            r.border = 'none';
        }
        r.boxSizing = 'border-box';
        r.padding = '0 0 0 0';
        if (this.state.height > 0) {
            r.lineHeight = this.state.height + 'px';
        }
        return r;
    }

    style(): React.CSSProperties {
        return omit(
            this.state.style,
            'borderColor',
            'borderStyle',
            'borderRadius',
            'paddingLeft',
            'paddingRight',
            'paddingTop',
            'paddingBottom'
        );
    }

    render() {
        let inputMode: Dictionary<string> = {};
        switch (this.state.type) {
            case 'regular':
                break;
            case 'go':
                inputMode.type = 'text';
                inputMode.title = 'go';
                break;
            case 'numeric':
                inputMode.type = 'text';
                inputMode.inputMode = 'numeric';
                break;
            case 'search':
                inputMode.type = 'search';
                inputMode.inputMode = 'search';
                inputMode.title = 'search';
                break;
            case 'phone':
                inputMode.type = 'text';
                inputMode.inputMode = 'tel';
                break;

            case 'url':
                inputMode.type = 'text';
                inputMode.inputMode = 'url';
                break;
        }

        let input = (
            <input
                style={this.textFieldStyle()}
                {...(inputMode as Dictionary<string>)}
                placeholder={this.state.placeholder}
                value={this.state.text}
                autoFocus={this.state.autoFocus}
                onChange={(e) => this.textEntered(e.target.value)}
                onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        e.stopPropagation();
                        this.enterPressed();
                        return false;
                    } else return undefined;
                }}
                ref={x => this.inputRef.next(x)}
            />
        );
        if (this.state.type === 'go') {
            input = <form action={'#'}>{input}</form>;
        }
        const extra = pick(this.state, 'id');
        return (
            <div
                {...extra}
                style={this.style()}
                className={this.className}
                ref={composeRefs(this.setViewRef, this.props.innerRef)}
            >
                {input}
            </div>
        );
    }
}

export class ReactTextField extends ReactTextFieldBase {
    protected textEntered(e: string): void {
        (this.props.parentView as TextField).onChange(e);
    }

    protected enterPressed(): void {
        (this.props.parentView as TextField).onEnter();
    }
}
