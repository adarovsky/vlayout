import * as React from 'react';
import './App.css';
import { Engine, Layout } from '../.';
import { BehaviorSubject, from, interval, timer } from 'rxjs';
import { delayWhen, take } from 'rxjs/operators';

import { readFileSync } from 'fs';

const layout = readFileSync(__dirname + '/test.vlayout', 'utf8');

interface User {
    id: number;
    name: BehaviorSubject<string>;
}

class App extends React.Component {
    private readonly engine: Engine;

    state: { layout: Layout | null; error: Error | null; isLoaded: boolean } = {
        error: null,
        isLoaded: false,
        layout: null
    };

    constructor(props: any) {
        super(props);

        this.engine = new Engine();

        const item = (index: number) => ({
            user: {
                id: `user-${index}`,
                name: `User-${index + 1}`
            }
        })
        const data = [[0], [0, 1], [1], [0, 1], [0, 1, 2], [0, 1, 2, 3], [1, 2, 3], [0, 1, 2, 3]].map(
            value => value.map(item)
        )

        const list = from(data).pipe(
            delayWhen((value, index) => timer(index * 3000))
        );

        this.engine.registerList("MyItems", {
            user: {
                name: this.engine.stringType()
            },
            newUser: {}
        });
        this.engine.registerInput(
            "items",
            this.engine.type("MyItems")!,
            list
        );
        this.engine.registerInput(
            "test",
            this.engine.numberType(),
            interval(1000).pipe(take(2))
        );
        this.engine.registerListTextField('nameField', (i, s) => (i as unknown as User).name.next(s));
        const cnt = new BehaviorSubject('');
        this.engine.registerTextField('textField', x => cnt.next(x), cnt, () => cnt.next(''));

    }

    render() {
        return <Layout engine={this.engine} content={layout}/>;
    }
}

export default App;
