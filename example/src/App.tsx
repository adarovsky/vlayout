import React, {Component} from 'react';
import './App.css';
import {Engine, Layout} from '@adarovsky/vlayout';
import {BehaviorSubject, interval} from "rxjs";
import {scan, take} from "rxjs/operators";
import {Dictionary} from "../../src/types";

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

        const list = interval(1000).pipe(
            scan((acc: Dictionary<any>, one) => {
                const record = { user: {id: one, name: `User-${one + 1}`} };
                return acc.concat([record]);
            }, [])
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
            list.pipe(take(4))
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
