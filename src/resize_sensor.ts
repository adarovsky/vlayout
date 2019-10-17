import {BehaviorSubject, EMPTY, Observable} from "rxjs";
import {distinctUntilChanged, finalize, shareReplay, switchMap} from "rxjs/operators";
import _ from "lodash";

const observers: [Element, Observable<ElementSize>][] = [];
export {observers};

export interface ElementSize {
    width: number;
    height: number;
}

let pausedCount = 0;
export function pauseObserving() {
    paused.next(++pausedCount > 0);
}

export function resumeObserving() {
    paused.next(Math.max(--pausedCount, 0) > 0);
}

const paused = new BehaviorSubject<boolean>(false);

export function resizeObserver(element: HTMLDivElement): Observable<ElementSize> {
    const obj = observers.find( o => o[0] === element);
    if (obj) {
        return obj[1];
    }

    const innerObserver = new Observable<ElementSize>(subscriber => {
        const style = getComputedStyle(element);
        const zIndex = ((style && style.zIndex) ? parseInt(style.zIndex)! : 0) - 1;

        let expand = document.createElement('div');
        expand.style.position = "absolute";
        expand.style.left = "0px";
        expand.style.top = "0px";
        expand.style.right = "0px";
        expand.style.bottom = "0px";
        expand.style.overflow = "hidden";
        expand.style.zIndex = `${zIndex}`;
        expand.style.visibility = "hidden";

        let expandChild = document.createElement('div');
        expandChild.style.position = "absolute";
        expandChild.style.left = "0px";
        expandChild.style.top = "0px";
        expandChild.style.width = "10000000px";
        expandChild.style.height = "10000000px";
        expand.appendChild(expandChild);

        let shrink = document.createElement('div');
        shrink.style.position = "absolute";
        shrink.style.left = "0px";
        shrink.style.top = "0px";
        shrink.style.right = "0px";
        shrink.style.bottom = "0px";
        shrink.style.overflow = "hidden";
        shrink.style.zIndex = `${zIndex}`;
        shrink.style.visibility = "hidden";

        let shrinkChild = document.createElement('div');
        shrinkChild.style.position = "absolute";
        shrinkChild.style.left = "0px";
        shrinkChild.style.top = "0px";
        shrinkChild.style.width = "200%";
        shrinkChild.style.height = "200%";
        shrink.appendChild(shrinkChild);

        element.appendChild(expand);
        element.appendChild(shrink);

        function setScroll() {
            expand.scrollLeft = 10000000;
            expand.scrollTop = 10000000;

            shrink.scrollLeft = 10000000;
            shrink.scrollTop = 10000000;
        }
        setScroll();

        let size = element.getBoundingClientRect();

        let currentWidth = size.width;
        let currentHeight = size.height;
        subscriber.next({width: currentWidth, height: currentHeight});

        let onScroll = function () {
            let size = element.getBoundingClientRect();

            let newWidth = size.width;
            let newHeight = size.height;

            if (newWidth !==currentWidth || newHeight !==currentHeight) {
                currentWidth = newWidth;
                currentHeight = newHeight;

                subscriber.next({width: currentWidth, height: currentHeight});
            }

            setScroll();
        };

        expand.addEventListener('scroll', onScroll);
        shrink.addEventListener('scroll', onScroll);

        return () => {
            expand.removeEventListener('scroll', onScroll);
            shrink.removeEventListener('scroll', onScroll);

            expand.remove();
            expandChild.remove();
            shrink.remove();
            shrinkChild.remove();
        }
    }).pipe(distinctUntilChanged(_.isEqual), shareReplay({bufferSize: 1, refCount: true}));

    const observer = paused.pipe(
        distinctUntilChanged(),
        switchMap(paused => paused ? EMPTY : innerObserver),
        finalize(() => {
            const index = observers.findIndex( o => o[0] === element);
            if (index >= 0) observers.splice(index, 1);
        })
    );
    observers.push([element, observer]);
    return observer;
}
