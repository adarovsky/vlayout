import React, {Component} from 'react';
import './App.css';
import {Engine, Layout} from '@adarovsky/vlayout';
import {interval, timer} from "rxjs";
import {pluck, scan, startWith, take} from "rxjs/operators";
import {Dictionary} from "../../src/types";

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
        this.engine.inputs.registerInput("counter", this.engine.numberType(), interval(5000).pipe(
            startWith(0),
            scan((acc, one) => {
                const [cur, delta] = acc;
                let d = delta;
                if (cur + d > 4 || cur + d < 0) {
                    d = -d;
                }
                return [cur + d, d];
            }, [1, -1]),
            pluck(0)
        ));

        const list = interval(500).pipe(
            scan((acc: Dictionary<any>, one) => {
                const record = { user: { id: one, name: `User-${one + 1}` } };
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

            // of([
            //     { user: { id: 1, name: "Alex" } },
            //     { user: { id: 2, name: "Anton" } },
            //     { user: { id: 3, name: "Denis" } },
            //     { user: { id: 4, name: "User 4" } },
            //     { user: { id: 5, name: "User 5" } },
            //     { user: { id: 6, name: "User 5" } },
            //     { newUser: { id: "new" } }
            // ])

            list.pipe(take(10))
        );
        //   this.engine.inputs.registerInput("counter", this.engine.numberType(), of(3));
        // this.engine.registerView('myView', x => <SampleView parentView={x} key={'123'}/>);
        this.engine.registerButton('myButton', async () => {
            console.log('clicked');
            await timer(1000).toPromise();
        });

        this.engine.registerListButton('itemTapped', async item => {
            console.log('item', item, 'tapped')
            await timer(100).toPromise();
        })

        this.engine.registerListButton('buttonTapped', async item => {
            console.log('button', item, 'tapped')
            await timer(100).toPromise();
        })

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