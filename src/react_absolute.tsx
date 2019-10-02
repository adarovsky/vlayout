import {ReactContainer, ReactView, ReactViewProps, ReactViewState} from "./react_views";
import {combineLatest, Subscription} from "rxjs";
import React from "react";
import {Container, ViewProperty} from "./view";

export class ReactAbsoluteLayout extends ReactContainer {
    protected subviewSubscription: Subscription = new Subscription();

    componentWillUnmount(): void {
        super.componentWillUnmount();
        this.subviewSubscription.unsubscribe();
    }


    styleValue(props: ViewProperty[], value: any[]): React.CSSProperties {
        const r = super.styleValue(props, value);
        if (!r.position)
            r.position = 'relative';
        return r;
    }

    protected updateSubviewPositions(): void {

        const self = this.viewRef.current;
        if (!self) return;

        const children = (this.props.parentView as Container).views
            .map(v => v.instance)
            .filter(v => v !== null) as ReactView<ReactViewProps, ReactViewState>[];

        this.subviewSubscription.unsubscribe();
        this.subviewSubscription = combineLatest(children.map(c => c!.intrinsicSize()))
            .subscribe(sizes => {
                    console.log("sizes:", sizes);
                    if (!this.state.style.width) {
                        let maxWidth = 0;

                        console.log('updating width from children', children);
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
                        });

                        if (maxWidth > 0) {
                            console.log(`updating absolute width to ${maxWidth}`);
                            self.style.width = maxWidth + 'px';
                        }
                    }

                    if (!this.state.style.height) {
                        let maxHeight = 0;
                        sizes.forEach((size, index) => {
                            const child = children[index];
                                maxHeight = Math.max(maxHeight, size.height);

                                let match;
                                if (typeof child.state.style.top === 'string' && (match = child.state.style.top.match(/(\d+)px/))) {
                                    maxHeight += +match[1];
                                }
                                if (typeof child.state.style.bottom === 'string' && (match = child.state.style.bottom.match(/(\d+)px/))) {
                                    maxHeight += +match[1];
                                }
                        });


                        if (maxHeight > 0) {
                            console.log(`updating absolute height to ${maxHeight}`);
                            self.style.height = maxHeight + 'px';
                        }
                    }
                    console.log(`update complete: ${self.style.width}`);
                }
            );
    }
}