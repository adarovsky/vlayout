import { ReactView, ReactViewProps, ReactViewState } from '../';
import React from 'react';
import _ from 'lodash';

interface SampleProps extends ReactViewProps {
    color: string
}
export class SampleView extends ReactView<SampleProps, ReactViewState> {

    render() {
        return (<div style={_.extend(this.state.style, {backgroundColor: this.props.color})} className={this.state.className}>
        </div>);
    }
}
