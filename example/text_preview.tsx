import React, { Component } from 'react';

export interface TextPreviewProps {
    url: string;
}

interface TextPreviewState {
    content: string;
}

export class TextPreview extends Component<TextPreviewProps, TextPreviewState> {
    constructor(props: TextPreviewProps) {
        super(props);
        this.state = {content: ''};
    }
    componentDidMount(): void {
        fetch(this.props.url)
            .then(res => res.text())
            .then(c => this.setState({content: c}));
    }
    render() {
        return (<div className='text_preview'>{this.state.content}</div>);
    }
}
