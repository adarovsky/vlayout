import { ReactContainer, ReactContainerState } from './react_views';
import { combineLatest, Observable } from 'rxjs';
import React from 'react';
import { ViewProperty } from './view';
import { ElementSize } from './resize_sensor';
import { distinctUntilChanged, map, startWith, switchMap } from 'rxjs/operators';
import { isEqual } from 'lodash';

export class ReactStackLayout extends ReactContainer<ReactContainerState> {

    styleValue(props: ViewProperty[], value: any[]): React.CSSProperties {
        const r = super.styleValue(props, value);
        if (r.position !== 'absolute')
            r.position = 'relative';
        return r;
    }


    intrinsicSize(): Observable<ElementSize> {
        return this.children.pipe(
            switchMap(children => combineLatest(children.map(c => c.intrinsicSize()))),
            map(sizes => {
                let maxHeight = 0;
                let maxWidth = 0;

                sizes.forEach((size) => {
                    maxHeight = Math.max(maxHeight, size.height);
                    maxWidth = Math.max(maxWidth, size.width);
                });

                return {
                    width: maxWidth,
                    height: maxHeight
                };
            }),
            startWith({width: 0, height: 0}),
            distinctUntilChanged(isEqual)
        );
    }
}
