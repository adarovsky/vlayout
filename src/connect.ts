import React, { createElement } from 'react';
import { combineLatest, Observable, of, Subscription } from 'rxjs';
import { fromPairs, toPairs, unzip, zip } from 'lodash';

export type ObservableMapObject<S = any> = {
    [K in keyof S]: Observable<S[K]>|S[K]
}

export function connect<P, S = {}>(WrappedComponent: React.FC<P> | React.ComponentClass<P, S>) {
    return class Connector extends React.PureComponent<ObservableMapObject<P>, P> {
        subscription = new Subscription();

        componentDidMount(): void {
            this.subscription.unsubscribe();
            const pairs = toPairs(this.props);
            const [keys, values] = unzip(pairs);
            this.subscription = combineLatest(values.map(v => v instanceof Observable ? v : of(v))).subscribe(s => {
                const pairs = zip(keys, s);
                const state = fromPairs(pairs);
                this.setState(state as P);
            });
        }

        componentWillUnmount(): void {
            this.subscription.unsubscribe();
        }

        render(): React.ReactElement<any, string | React.JSXElementConstructor<any>> | string | number | {} | React.ReactNodeArray | React.ReactPortal | boolean | null | undefined {
            if (this.state) {
                return createElement(WrappedComponent, this.state);
            } else {
                return null;
            }
        }
    }
}
