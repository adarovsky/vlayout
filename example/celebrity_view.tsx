import { ReactView, ReactViewProps, ReactViewState } from '../';
import React from 'react';

interface SampleProps extends ReactViewProps {
    color: string
}
export class CelebrityView extends ReactView<SampleProps, ReactViewState> {

    style(): React.CSSProperties {
        const s = {...super.style()};
        s.backgroundColor = this.props.color;
        return s;
    }

    render() {
        return (<div style={this.style()} className={'vyu_session_self_preview'} ref={this.viewRef}>
            <video muted={true} style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
            }}/>
        </div>);
    }
}
