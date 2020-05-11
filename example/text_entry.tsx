import React, { Component } from 'react';
import { Observable, Subscription } from 'rxjs';
import { ReactView, ReactViewProps, ReactViewState } from '../';

export interface TextEntryProps {
    inputId?:   string;
    className?: string;
    placeholder?: string;
    content:    Observable<string>;
    contentChanged: (content: string) => void;
}

interface TextEntryState {
    content: string;
    external: string;
}

export class TextEntry extends Component<TextEntryProps, TextEntryState> {
    readonly inputRef = React.createRef<HTMLInputElement>();
    readonly subscription = new Subscription();

    constructor(props: TextEntryProps) {
        super(props);
        this.state = {...this.state, content: '', external: ''};
    }

    private textEntered(text: string) {
        this.setState({content: text} );
        this.props.contentChanged(text);
    }

    componentDidMount(): void {
        this.subscription.add(this.props.content.subscribe(x => this.setState( {external: x})));
    }

    componentWillUnmount(): void {
        this.subscription.unsubscribe();
    }

    render() {
        return (<div style={{width: '100%'}} className={this.props.className ?? 'cmpma_input_text'}>
            <input id={this.props.inputId}
                   style={{width: '100%'}}
                   className={this.props.className ?? 'cmpma_input_text'}
                   placeholder={this.props.placeholder}
                   value={this.state.content || this.state.external}
                   onChange={e => this.textEntered(e.target.value)}
                   ref={this.inputRef}/>
        </div>);
    }
}

export class LayoutTextEntry extends ReactView<TextEntryProps & ReactViewProps, ReactViewState & TextEntryState> {
    render() {
        return (<div className={this.props.className ?? 'cmpma_input_text_container'} style={this.style()}>
            <TextEntry {...this.props} />
        </div>);
    }
}
