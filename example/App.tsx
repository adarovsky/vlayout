import * as React from 'react';
import './App.css';
import { Engine, Layout } from '../.';
import { BehaviorSubject, from, timer } from 'rxjs';
import { delayWhen } from 'rxjs/operators';

import { readFileSync } from 'fs';

const layout = readFileSync(__dirname + '/test.vlayout', 'utf8');

interface User {
    id: number;
    name: BehaviorSubject<string>;
}

class App extends React.Component {
    state: { layout: Layout | null; error: Error | null; isLoaded: boolean } = {
        error: null,
        isLoaded: false,
        layout: null,
    };
    private readonly engine: Engine;

    constructor(props: any) {
        super(props);

        this.engine = new Engine();

        const item = (index: number) => ({
            user: {
                id: `user-${index}`,
                name: `User-${index + 1}`,
            },
        });
        const data = [[0], [0, 1], [1], [0, 1], [0, 1, 2], [0, 1, 2, 3], [1, 2, 3], [0, 1, 2, 3]].map(
            value => value.map(item),
        );

        const list = from(data).pipe(
            delayWhen((value, index) => timer(index * 3000)),
        );

        const text = from(['one', 'two', 'three', 'four']).pipe(
            delayWhen((value, index) => timer(index * 3000 + 4000)),
        );

        this.engine.registerList('MyItems', {
            user: {
                name: this.engine.stringType(),
            },
            newUser: {},
        });
        this.engine.registerInput(
            'items',
            this.engine.type('MyItems')!,
            list,
        );
        this.engine.registerInput(
            'text',
            this.engine.stringType(),
            text,
        );
    }

    render() {
        return <Layout engine={this.engine} content={layout} className={'asdasdasd'}/>;
    }
}

export default App;
