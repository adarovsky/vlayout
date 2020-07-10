import { ReactViewProps, ReactViewState } from 'react_views';
import { ReactView } from 'index';
import React from 'react';

export class LayoutComponent extends ReactView<ReactViewProps, ReactViewState> {
    render() {
        return <div style={this.style()} className={this.className} ref={x => this.setViewRef(x)}>
            {this.props.children}
        </div>;
    }
}


