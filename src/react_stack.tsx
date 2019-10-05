import {ReactContainer} from "./react_views";
import {combineLatest, Observable, Subscription} from "rxjs";
import React from "react";
import {ViewProperty} from "./view";
import {ElementSize} from "./resize_sensor";
import {map, switchMap} from "rxjs/operators";

export class ReactStackLayout extends ReactContainer {
    protected subviewSubscription: Subscription = new Subscription();

    componentWillUnmount(): void {
        super.componentWillUnmount();
        this.subviewSubscription.unsubscribe();
    }

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
            })
        );
    }
}