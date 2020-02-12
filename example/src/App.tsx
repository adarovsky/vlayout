import React, {Component} from 'react';
import './App.css';
import {Engine, Layout} from '@adarovsky/vlayout';
import {BehaviorSubject} from "rxjs";

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
        const s = new BehaviorSubject('');
        this.engine.registerTextField('textField', t => s.next(t+t), s);
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