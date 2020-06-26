import React, { Component } from 'react';
import { Observable, Subscription } from 'rxjs';
import { ReactView, ReactViewProps, ReactViewState } from '../';
import SessionControlUtils from './utils';

export interface URLEntryProps {
    content:            Observable<string>;
    urlChanged:         (content: string) => void;
}

interface URLEntryState {
    content: string;
    external: string;
    error: string;
}

export class URLEntry extends Component<URLEntryProps, URLEntryState> {
    readonly inputRef = React.createRef<HTMLInputElement>();
    readonly subscription = new Subscription();

    constructor(props: URLEntryProps) {
        super(props);
        this.state = {...this.state, content: '', external: ''};
    }

    private textEntered(text: string) {
        this.setState({content: text, error: !text || SessionControlUtils.isUrlValid(text) ? '' : 'Wrong url'});
        this.props.urlChanged(text);
    }

    componentDidMount(): void {
        this.subscription.add(this.props.content.subscribe(x => this.setState( {external: x})));
    }

    componentWillUnmount(): void {
        this.subscription.unsubscribe();
    }

    render() {
        return (<div style={{width: '100%'}}>
            <input className='cmpma_input_url'
                   value={this.state.content || this.state.external}
                   onChange={e => this.textEntered(e.target.value)}
                   ref={this.inputRef}/>
            {this.state.error && <span className='cmpma_error'>{this.state.error}</span>}
        </div>);
    }
}

export class LayoutURLEntry extends ReactView<URLEntryProps & ReactViewProps, ReactViewState & URLEntryState> {
    render() {

        return (<div style={this.style()}>
            <URLEntry content={this.props.content} urlChanged={this.props.urlChanged}/>
        </div>);
    }
}
