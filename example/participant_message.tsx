import React from 'react';
import { ReactView, ReactViewProps, ReactViewState } from '../';

export interface ParticipantMessageProps {
    sendMessage: (content: string) => void;
}

interface ParticipantMessageState {
    content: string;
}
export class ParticipantMessage extends ReactView<ParticipantMessageProps & ReactViewProps, ParticipantMessageState & ReactViewState> {

    constructor(props: ParticipantMessageProps & ReactViewProps) {
        super(props);
        this.state = {...this.state, content: ''}
    }

    render() {
        return (<div className={this.className} style={this.style()}>
                <input placeholder='Send message...'
                       value={this.state.content}
                       onChange={e => this.onContentChanged(e)}
                       onKeyPress={(e) => this.onKeyPress(e)}
                />

                       <div className={"send_button" + (!!this.state.content ? '' : ' disabled')}
                            onClick={() => this.sendClicked()}
                       >Send</div>
        </div>);
    }


    private onContentChanged(e: React.ChangeEvent<HTMLInputElement>) {
        this.setState({content: e.target.value});
    }

    get className(): string {
        let r = this.state.className;
        if (!this.state.content)
            r += ' inactive';
        return r;
    }

    private sendClicked() {
        this.props.sendMessage(this.state.content);
        this.setState({content: ''});
    }

    private onKeyPress(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === 'Enter') {
            this.sendClicked();
        }
    }
}
