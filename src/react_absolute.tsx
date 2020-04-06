import {ReactContainer, ReactContainerState, ReactView, ReactViewProps, ReactViewState} from "./react_views";
import {combineLatest, Observable, pipe} from "rxjs";
import React from "react";
import {ViewProperty} from "./view";
import {ElementSize} from "./resize_sensor";
import {map, switchMap} from "rxjs/operators";

export class ReactAbsoluteLayout<S extends ReactContainerState> extends ReactContainer<S> {

    styleValue(props: ViewProperty[], value: any[]): React.CSSProperties {
        const r = super.styleValue(props, value);
        if (!r.position)
            r.position = 'relative';
        return r;
    }

    intrinsicSize(): Observable<ElementSize> {
        return this.children.pipe(absoluteIntrinsicSize());
    }
}

export function absoluteIntrinsicSize() {
    return pipe(
        switchMap((children: ReactView<ReactViewProps, ReactViewState>[]) =>
            combineLatest(children.map(c => c.intrinsicSize())).pipe(map(sizes => [children, sizes]))
        ),
        map((project) => {
            const children = project[0] as ReactView<ReactViewProps, ReactViewState>[];
            const sizes = project[1] as ElementSize[];
            let maxHeight = 0;
            let maxWidth = 0;

            sizes.forEach((size, index) => {
                const child = children[index];

                maxWidth = Math.max(maxWidth, size.width);
                let match;
                if (typeof child.state.style.left === 'string' && (match = child.state.style.left.match(/(\d+)px/))) {
                    maxWidth += +match[1];
                }
                if (typeof child.state.style.right === 'string' && (match = child.state.style.right.match(/(\d+)px/))) {
                    maxWidth += +match[1];
                }

                maxHeight = Math.max(maxHeight, size.height);

                if (typeof child.state.style.top === 'string' && (match = child.state.style.top.match(/(\d+)px/))) {
                    maxHeight += +match[1];
                }
                if (typeof child.state.style.bottom === 'string' && (match = child.state.style.bottom.match(/(\d+)px/))) {
                    maxHeight += +match[1];
                }
            });

            return {
                width: maxWidth,
                height: maxHeight
            };
        })
    )
}
