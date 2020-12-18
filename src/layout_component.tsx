import { ReactViewProps, ReactViewState } from './react_views';
import { ReactView } from './index';
import React from 'react';

export class LayoutComponent extends ReactView<ReactViewProps, ReactViewState> {
    render() {
        const style = this.style();
        if (!style.position) {
            style.position = 'relative';
        }
        return (
            <div
                style={style}
                className={this.className}
                ref={(x) => this.setViewRef(x)}
            >
                {this.props.children}
            </div>
        );
    }
}
