import * as React from 'react';
import { Component } from 'react';
import './App.css';
import { Engine, Layout, LayoutComponent } from '../';
import { fromEvent, interval, of } from 'rxjs';
import 'bootstrap/dist/css/bootstrap.min.css';
import { readFileSync } from 'fs';
import { delay, map, startWith } from 'rxjs/operators';

const layout = readFileSync(__dirname + '/test.vlayout', 'utf8');

interface AppState {
    content?: string;
    error?: Error;
    isLoaded: boolean;
}

class App extends Component {
    private readonly engine = new Engine(true);

    constructor(props: any) {
        super(props);

        this.engine.registerInput(
            'window.width',
            this.engine.numberType(),
            fromEvent(window, 'resize').pipe(
                startWith(window.innerWidth),
                map((e) => window.innerWidth)
            )
        );
        this.engine.registerInput(
            'window.height',
            this.engine.numberType(),
            fromEvent(window, 'resize').pipe(
                startWith(window.innerHeight),
                map((e) => window.innerHeight)
            )
        );

        this.engine.registerList('TestList', {
            item: {
                name: this.engine.stringType(),
            },
        });

        // this.engine.registerInput('testList', this.engine.type('TestList')!, interval(1000).pipe(
        //     startWith(0),
        //     scan((acc, one) => {
        //         const [cur, delta] = acc;
        //         let d = delta;
        //         if (cur + d > 8 || cur + d < 0) {
        //             d = -d;
        //         }
        //         return [cur + d, d];
        //     }, [1, -1]),
        //     pluck(0),
        //     map(counter => Array(counter).fill(null).map((value, index) => ({
        //         item: {
        //             id: index,
        //             name: `Item-${index}`
        //         }
        //     }))),
        //     take(4)
        // ));

        this.engine.registerInput(
            'testList',
            this.engine.type('TestList')!,
            of(
                Array(20)
                    .fill(null)
                    .map((value, index) => ({
                        item: { id: index, name: `Item-${index + 1}` },
                    }))
            )
        );

        this.engine.registerInput(
            'counter',
            this.engine.numberType(),
            interval(1000).pipe(map((v) => v % 5))
        );
        this.engine.registerInput(
            'test',
            this.engine.stringType(),
            of('sample text').pipe(
                delay(5000)
                // startWith(null)
            )
        );

        this.engine.registerView('testView', (parent) => (
            <LayoutComponent parentView={parent}>
                <div
                    style={{
                        position: 'absolute',
                        width: '100%',
                        height: '100%',
                        backgroundColor: '#cceeff',
                    }}
                />
            </LayoutComponent>
        ));

        this.engine.registerButton('inviteHostIFB', async () => {});
        this.engine.registerButton('toggleHostIFB', async () => {});
    }

    render() {
        return (
            <Layout engine={this.engine} content={layout} key={'content1'} />
        );
    }
}

export default App;
