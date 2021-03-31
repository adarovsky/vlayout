import { ReactViewProps, ReactViewState } from './react_views';
import { ReactView } from './index';
import React from 'react';
import composeRefs from '@seznam/compose-react-refs';

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
                ref={composeRefs(this.setViewRef, this.props.innerRef)}
            >
                {this.props.children}
            </div>
        );
    }
}
