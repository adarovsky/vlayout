import {ReactContainer, ReactView, ReactViewProps, ReactViewState} from "./react_views";
import {combineLatest, Subscription} from "rxjs";
import React from "react";
import {Container, ViewProperty} from "./view";

export class ReactStackLayout extends ReactContainer {
    protected subviewSubscription: Subscription = new Subscription();

    componentWillUnmount(): void {
        super.componentWillUnmount();
        this.subviewSubscription.unsubscribe();
    }

    protected updateSubviewPositions(): void {
        const self = this.viewRef.current;
        if (!self) return;

        const children = (this.props.parentView as Container).views
            .map(v => v.instance)
            .filter(v => v !== null) as ReactView<ReactViewProps, ReactViewState>[];

        this.subviewSubscription.unsubscribe();
        this.subviewSubscription = combineLatest(children.map(c => c.intrinsicSize()))
        // .pipe(takeWhile(() => !this.state.style.width || !this.state.style.height))
            .subscribe(sizes => {
                    // console.log("sizes:", sizes);
                    if (!this.state.style.width) {
                        let maxWidth = 0;

                        sizes.forEach(size => maxWidth = Math.max(maxWidth, size.width));

                        if (maxWidth > 0) {
                            // console.log(`updating stack width to ${maxWidth}`);
                            self.style.width = maxWidth + 'px';
                        }
                    }

                    if (!this.state.style.height) {
                        let maxHeight = 0;
                        sizes.forEach(size => maxHeight = Math.max(maxHeight, size.height));


                        if (maxHeight > 0) {
                            // console.log(`updating stack height to ${maxHeight}`);
                            self.style.height = maxHeight + 'px';
                        }
                    }
                    console.log(`update complete: ${self.style.width}`);
                }
            );
    }

    styleValue(props: ViewProperty[], value: any[]): React.CSSProperties {
        const r = super.styleValue(props, value);
        if (r.position !== 'absolute')
            r.position = 'relative';
        return r;
    }
}