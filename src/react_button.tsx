import {ViewProperty} from "./view";
import {combineLatest} from "rxjs";
import React, {CSSProperties} from "react";
import _ from "lodash";
import {ReactRoundRect} from "./react_primitives";
import {FontContainer, ImageContainer} from "./types";
import {map} from "rxjs/operators";
import {Button} from "./primitives";

export class ReactButton extends ReactRoundRect {
    state: { image: ImageContainer; style: CSSProperties; text: string; imageStyle: CSSProperties, running: boolean, enabled: boolean } = {
        style: {},
        text: '',
        image: new ImageContainer(''),
        imageStyle: {},
        running: false,
        enabled: true
    };

    public styleProperties(): ViewProperty[] {
        const sup = super.styleProperties();
        // const enabled = new ViewProperty('enabled', 'Bool');
        // let sink =
        // enabled.value = {sink: EMPTY,
        //     line: 0,
        //     column: 0,
        //     typeDefinition: null,
        //     link(layout: Layout, hint: TypeDefinition | null): void {
        //     }};
        return sup.concat(this.props.parentView.activePropertiesNamed('textColor', 'font', 'imagePosition',
            'contentPadding.left', 'contentPadding.top', 'contentPadding.right', 'contentPadding.bottom'));
    }

    componentDidMount(): void {
        super.componentDidMount();
        this.wire('text', 'text', x => x);
        this.wire('image', 'image', x => x);

        const paddingProp = this.props.parentView.property('imagePadding');
        const imagePositionProp = this.props.parentView.property('imagePosition');
        const image = this.props.parentView.property('image');
        const text = this.props.parentView.property('text');

        if (paddingProp.value && image.value && text.value) {
            this.subscription.add(combineLatest([paddingProp.value.sink,
                imagePositionProp.value!.sink,
                image.value.sink, text.value.sink]).pipe(
                map( ([padding, imagePosition, image, text]) => {
                    const r: CSSProperties = {};
                    if (!!image && !!text) {
                        switch (imagePosition) {
                            case 'left':
                            case 'leftToText':
                                r.marginRight = padding;
                                break;
                            case 'right':
                            case 'rightToText':
                                r.marginLeft = padding;
                                break;
                            case 'top':
                                r.marginBottom = padding;
                                break;
                            case 'bottom':
                                r.marginTop = padding;
                                break;
                        }
                    }
                    return r;
                })
            ).subscribe( x => this.setState(s => Object.assign(s, {imageStyle: x}))));
        }

        const paddings = this.props.parentView.activePropertiesNamed('contentPadding.left', 'contentPadding.top',
            'contentPadding.right', 'contentPadding.bottom');

        if (paddings.length === 0) {
            let self = this.viewRef.current as HTMLElement;

            this.subscription.add(this.cornerRadiusWatcher.subscribe(([size, radius]) => {
                if (size.width > 0 && radius <= 0.5) {
                    self.style.paddingRight = self.style.paddingLeft = `${Math.max(10, size.height * radius / 2)}px`;
                }
            }));
        }
    }

    styleValue(props: ViewProperty[], value: any[]): React.CSSProperties {
        const r = super.styleValue(props, value);
        let imagePosition = 'leftToText';

        r.display = 'flex';
        r.cursor = 'pointer';
        _.forEach(value, (val, index) => {
            switch (props[index].name) {
                case 'textColor':
                    r.color = val.toString();
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
                r.justifyContent = 'space-between';
                break;
            case 'leftToText':
                r.flexDirection = 'row';
                r.justifyContent = 'center';
                break;
            case 'right':
                r.flexDirection = 'row-reverse';
                r.justifyContent = 'space-between';
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

    private handleClick(): void {
        if (this.state.running) return;
        this.setState(s => Object.assign(s, {running: true}));
        (this.props.parentView as Button).onClick().finally(() =>
            this.setState(s => Object.assign(s, {running: false})));
    }

    private currentStyle(): CSSProperties {
        const s = _.cloneDeep(this.state.style);
        if (this.state.running) {
            s.cursor = 'progress';
            s.opacity = 0.6;
            s.pointerEvents = 'none';
        }
        else if (!this.state.enabled) {
            s.cursor = 'not-allowed';
            s.opacity = 0.6;
            s.pointerEvents = 'none';
        }
        else {
            s.pointerEvents = 'auto';
        }
        return s;
    }

    render(): React.ReactElement<any, string | React.JSXElementConstructor<any>> | string | number | {} | React.ReactNodeArray | React.ReactPortal | boolean | null | undefined {
        return (<div style={this.currentStyle()}
                     className={'vlayout_'+this.props.parentView.viewType()}
                     // @ts-ignore
                     ref={this.viewRef}
        onClick={() => this.handleClick()}>
            {this.state.image.src && <img src={this.state.image.src} style={this.state.imageStyle} alt={this.state.text}/>}
            {this.state.text && this.state.text.split('\n').map(function(item, key) {
                return (
                    <span key={key}>{item}<br/></span>
                )
            })}
        </div>);
    }
}
