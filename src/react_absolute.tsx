import { ReactContainer, ReactContainerState, ReactView, ReactViewProps, ReactViewState } from './react_views';
import { combineLatest, Observable, of, pipe } from 'rxjs';
import React from 'react';
import { ViewProperty } from './view';
import { ElementSize } from './resize_sensor';
import { map, switchMap } from 'rxjs/operators';
import { isNotNull } from './utils';

export class ReactAbsoluteLayout<S extends ReactContainerState> extends ReactContainer<S> {
    styleValue(props: ViewProperty[], value: any[]): React.CSSProperties {
        const r = super.styleValue(props, value);
        if (!r.position) r.position = 'relative';
        return r;
    }

    intrinsicSize(): Observable<ElementSize> {
        const selfSize = super.intrinsicSize();
        const childSize = this.children.pipe(absoluteIntrinsicSize());
        return combineLatest([selfSize, childSize]).pipe(
            map(([self, children]) => ({
                width: this.isWidthDefined() ? self.width : children.width,
                height: this.isHeightDefined() ? self.height : children.height
            }))
        )
    }

    definesChildWidth(
        child: ReactView<ReactViewProps, ReactViewState>,
    ): boolean {
        return this.isWidthDefined() &&
            (child.has('size.width') || (child.has('padding.left') && child.has('padding.right')));
    }

    definesChildHeight(
        child: ReactView<ReactViewProps, ReactViewState>,
    ): boolean {
        return this.isHeightDefined() &&
            (child.has('size.height') || (child.has('padding.top') && child.has('padding.bottom')));
    }
}

export function visibleChildrenWithSizes() {
    return pipe(
        switchMap((children: ReactView<ReactViewProps, ReactViewState>[]) =>
            children.length == 0
                ? of([[], []])
                : combineLatest(
                children.map(c =>
                    combineLatest([
                        c.safeIntrinsicSize(),
                        c.props.parentView.property('alpha').value!
                            .sink as Observable<number>,
                    ]),
                ),
                ).pipe(
                map(sizes => {
                    let elements: ReactView<ReactViewProps,
                        ReactViewState>[] = [];
                    let s: ElementSize[] = [];
                    for (let i = 0; i < children.length; ++i) {
                        let [size, alpha] = sizes[i];
                        if (alpha > 0) {
                            elements.push(children[i]);
                            s.push(size);
                        }
                    }
                    return [elements, s];
                }),
                ),
        ),
    );
}

export function visibleChildrenSizes() {
    return pipe(
        visibleChildrenWithSizes(),
        map(s => s[1] as ElementSize[]),
    );
}

export function absoluteIntrinsicSize() {
    return pipe(
        visibleChildrenWithSizes(),
        map(project => {
            const children = project[0] as ReactView<ReactViewProps,
                ReactViewState>[];
            const sv = project[1] as ElementSize[];
            let maxHeight = 0;
            let maxWidth = 0;

            sv.forEach((size, index) => {
                const child = children[index];

                maxWidth = Math.max(maxWidth, size.width);
                let match;
                if (
                    typeof child.state.style.left === 'string' &&
                    (match = child.state.style.left.match(/(\d+)px/))
                ) {
                    maxWidth += +match[1];
                }
                if (
                    typeof child.state.style.right === 'string' &&
                    (match = child.state.style.right.match(/(\d+)px/))
                ) {
                    maxWidth += +match[1];
                }

                maxHeight = Math.max(maxHeight, size.height);

                if (
                    typeof child.state.style.top === 'string' &&
                    (match = child.state.style.top.match(/(\d+)px/))
                ) {
                    maxHeight += +match[1];
                }
                if (
                    typeof child.state.style.bottom === 'string' &&
                    (match = child.state.style.bottom.match(/(\d+)px/))
                ) {
                    maxHeight += +match[1];
                }
            });

            return {
                width: maxWidth,
                height: maxHeight,
            };
        }),
    );
}
