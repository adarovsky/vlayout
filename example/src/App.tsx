import React, {Component} from 'react';
import './App.css';
import {Engine, Layout} from '@adarovsky/vlayout';
import {BehaviorSubject, from, interval, timer} from "rxjs";
import {delayWhen, take} from "rxjs/operators";

interface User {
    id: number;
    name: BehaviorSubject<string>;
}

class App extends Component {
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

    componentDidMount() {
        fetch("/test.vlayout")
            .then(res => res.text())
            .then(
                (result) => {
                    try {
                        this.setState({
                            isLoaded: true,
                            layout: <Layout engine={this.engine} content={result}/>
                        });
                    } catch (e) {
                        this.setState({
                            isLoaded: true,
                            error: e
                        });
                    }
                },
                (error) => {
                    this.setState({
                        isLoaded: true,
                        error
                    });
                }
            )
    }

    render() {
        const {error, isLoaded, layout} = this.state;
        if (error) {
            return <div>Ошибка: {error.message}</div>;
        } else if (!isLoaded) {
            return <div>Loading...</div>;
        } else {
            return layout;
        }
    }
}

export default App;
