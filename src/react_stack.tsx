import {
    ReactContainer,
    ReactContainerState,
    ReactView,
    ReactViewProps,
    ReactViewState,
} from './react_views';
import { combineLatest, Observable } from 'rxjs';
import React from 'react';
import { ViewProperty } from './view';
import { ElementSize } from './resize_sensor';
import { map } from 'rxjs/operators';
import { visibleChildrenSizes } from './react_absolute';

export class ReactStackLayout extends ReactContainer<ReactContainerState> {
    styleValue(props: ViewProperty[], value: any[]): React.CSSProperties {
        const r = super.styleValue(props, value);
        if (r.position !== 'absolute') r.position = 'relative';
        return r;
    }

    definesChildWidth(
        child: ReactView<ReactViewProps, ReactViewState>
    ): boolean {
        return this.isWidthDefined();
    }

    definesChildHeight(
        child: ReactView<ReactViewProps, ReactViewState>
    ): boolean {
        return this.isHeightDefined();
    }

    intrinsicSize(): Observable<ElementSize> {
        const selfSize = super.intrinsicSize();
        const childSize = this.children.pipe(
            visibleChildrenSizes(),
            map(sizes => {
                let maxHeight = 0;
                let maxWidth = 0;

                sizes.forEach(size => {
                    maxHeight = Math.max(maxHeight, size.height);
                    maxWidth = Math.max(maxWidth, size.width);
                });

                return {
                    width: maxWidth,
                    height: maxHeight,
                };
            })
        );

        return combineLatest([selfSize, childSize]).pipe(
            map(([self, children]) => ({
                width: this.isWidthDefined() ? self.width : children.width,
                height: this.isHeightDefined() ? self.height : children.height,
            }))
        );
    }
}
