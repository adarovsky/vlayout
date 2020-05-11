import React, { Component } from 'react';
import { asyncScheduler, Observable, Subscription } from 'rxjs';
import uuid from 'uuid';
import { ReactView, ReactViewProps, ReactViewState, resizeObserver } from '../';
import _ from 'lodash';

export interface WowFieldProps {
    shoot: Observable<string>;
    image: (s: string) => string;
}

interface Wow {
    id: string;
    type: string;
    offset: number;
    offsetPeriod: number;
    ttl: number;
}

interface WowFieldState {
    wows: Wow[];
    size: {width: number; height: number}
}

function WowComp(props: Wow & {topOffset: number; image: (s: string) => string;}) {
    return <div className={'wow_row'} style={{
        animation: `wowPop ${props.ttl}s infinite linear`
    }}><img style={{
        width: '35px',
        height: '35px',
        transform: `translateX(${props.offset}px)`,
        animationDuration: `${props.offsetPeriod}s`,
        animationName: 'wowLeftRight',
        animationIterationCount: 'infinite',
        animationTimingFunction: 'ease-in-out',
        animationDirection: 'alternate'
    }} src={'/logo192.png'}/>
    </div>;
}

export class WowField extends Component<WowFieldProps, WowFieldState> {
    subscription = new Subscription();
    objectRef = React.createRef<HTMLDivElement>();

    constructor(props: WowFieldProps) {
        super(props);
        this.state = {
            wows: [],
            size: {width: 0, height: 0}
        }
    }

    componentDidMount(): void {
        this.subscription.add(this.props.shoot.subscribe(type => this.shoot(type)));
        if (this.objectRef.current) {
            this.subscription.add(resizeObserver(this.objectRef.current).subscribe(size => {
                console.log(size);
                this.setState({size})
            }));
        }
        else {
            console.log('no ref');
        }
    }

    componentWillUnmount(): void {
        this.subscription.unsubscribe();
    }

    shoot(type: string) {
        const wow: Wow = {
            id: uuid.v1(),
            type: type,
            offset: Math.random(),
            offsetPeriod: Math.random() * 0.3 + 1,
            ttl: Math.random() * 7 + 5
        };
        this.setState(s => ({...s,
            wows: s.wows.concat([wow])
        }));
        this.subscription.add(asyncScheduler.schedule(() => this.setState(s => ({...s,
            wows: s.wows.filter(w => w.id !== wow.id)
        })), wow.ttl * 1000));
    }

    render() {
        return (<div style={{width: '100%', height: '100%'}} ref={this.objectRef}>
            {this.state.wows.map(w => <WowComp id={w.id}
                                               key={w.id}
                                               type={w.type}
                                               offset={w.offset*this.state.size.width}
                                               offsetPeriod={w.offsetPeriod}
                                               ttl={w.ttl}
                                               topOffset={this.state.size.height}
                                               image={this.props.image}
            />)}
        </div>);
    }
}

export class LayoutWowField extends ReactView<WowFieldProps & ReactViewProps, ReactViewState & WowFieldState> {
    render() {
        const extra = _.pick(this.state, 'id');
        return (<div className={this.state.className || 'vlayout_wowField'} style={this.style()} {...extra}>
            <WowField {...this.props} />
        </div>);
    }
}
