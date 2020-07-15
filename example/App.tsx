import * as React from 'react';
import { Component } from 'react';
import './App.css';
import { Engine, Layout } from '../';
import { interval, of } from 'rxjs';
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
    private readonly engine = new Engine();

    constructor(props: any) {
        super(props);

        this.engine.registerInput('counter', this.engine.numberType(), interval(1000).pipe(
            map(v => v % 5)
        ));
        this.engine.registerInput('test', this.engine.stringType(), of('sample text').pipe(
            delay(5000),
            startWith(null)
        ));
    }

    render() {
        return <Layout engine={this.engine} content={layout} key={'content1'}/>;
    }
}

export default App;
