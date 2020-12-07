import {
    ReactContainer,
    ReactContainerState,
    ReactView,
    ReactViewProps,
    ReactViewState,
} from './react_views';
import { Observable } from 'rxjs';
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
        return true;
    }

    definesChildHeight(
        child: ReactView<ReactViewProps, ReactViewState>
    ): boolean {
        return true;
    }

    intrinsicSize(): Observable<ElementSize> {
        return this.children.pipe(
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
    }
}
