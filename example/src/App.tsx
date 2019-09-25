import React, {Component} from 'react';
import './App.css';
import {Engine, Layout} from '@adarovsky/vlayout';
import {EMPTY, interval, of} from "rxjs";
import {delay, pluck, scan, startWith} from "rxjs/operators";

class App extends Component {
  private readonly engine: Engine;

  state: { layout: Layout|null; error: Error|null; isLoaded: boolean } = {
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
    //   this.engine.inputs.registerInput("counter", this.engine.numberType(), of(3));
    // this.engine.registerView('myView', x => <SampleView parentView={x} key={'123'}/>);
    this.engine.registerButton('myButton', async () => {
      console.log('clicked');
      await EMPTY.pipe(delay(1000)).toPromise();
    });
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
              }
              catch (e) {
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