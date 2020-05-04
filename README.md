# vlayout [![Build Status](https://travis-ci.org/adarovsky/vlayout.svg?branch=master)](https://travis-ci.org/adarovsky/vlayout) [![Coverage Status](https://coveralls.io/repos/github/adarovsky/vlayout/badge.svg)](https://coveralls.io/github/adarovsky/vlayout)
A port of simple reactive layout engine running in browsers.

Give it a layout description, wire external views, button click handlers and
put resulting React.JS component to your page. Layout will auto-update itself.

# Integrating to the app 
```js
import React, {Component} from 'react';
import './App.css';
import {Engine, Layout} from '@adarovsky/vlayout';
import {EMPTY, interval} from "rxjs";
import {delay, pluck, scan, startWith} from "rxjs/operators";

class App extends Component {

  state = {
    error: null,
    isLoaded: false,
    layout: null
  };

  constructor(props) {
    super(props);

    this.engine = new Engine();
    this.engine.inputs.registerInput("counter", this.engine.numberType(), interval(1000).pipe(
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
```

Let's highlight key points here:
  Here we create a central point where we register all connections between layout and outer world
  ```js
    this.engine = new Engine();
    this.engine.inputs.registerInput(name, type, source)
  ```

  To pass external values inside layout, we use
  ```typescript
    engine.inputs.registerInput(name: string, type: Engine.type, source: rxjs.Observable)
  ```

  To receive button press event from layout, register button:
  ```typescript
    this.engine.registerButton(name: string, handler: () => Promise);
```
  Please note that button will be disabled until handler's promise finishes or fails. Button look is defined in layout description

  To render external component in layout, one need to derive from ```ReactView<S extends ReactViewState>``` and be sure to pass
  ```style={self.state.style}``` in render code

  Once preparations are done, we can create and use ```Layout``` component like so
  ```jsx
    render() {
        return <Layout engine={this.engine} content={content}/>
    }
```
  In the example above, layout content is downloaded using AJAX, but it's up to you where to get it.
  
  # Layout description
  
  Layout description has 4 declarations. Let us show it by example. For full description, refer [layout syntax](doc/syntax.md)
  ```
bindings {
    myButton: button
}

inputs {
    counter: Number
}

layout {
   layer {
      id: "background"
      z_order: 1

      roundRect {
          center { x: 0.5 y: 0.5 }
          size { width: 0.8 }
          aspect: 16/9
          backgroundColor: #cccccc
      }
   }

   layer {
      id: "label"
      z_order: 2

      vertical {
          alignment: .center
          center { x: 0.5 y: 0.5 }
          label {
              text: String(counter)
          }
          myButton {
              backgroundColor: #dddddd
              strokeColor: #aaaaaa
              strokeWidth: 4
              text: "Click me"
              cornerRadius: 0.5
          }
      }
   }
}
```
  it results with an image like so: ![screenshot](doc/screenshot1.png?raw=true)

  Try to experiment with changing propery values. These are all expressions, not constants! For example, you can change
  button corner radius like so
  ```
    cornerRadius: switch(counter) {
        case 0|1 => 0.5 // you can match against a set of constants
        case 2 => 10    // note, that corner radius > 0.5 is absolute, specified in pixels
        case _ => 4     // set up a default value
    }
```
  
# License
MIT license.
Copyright ©️ Alexander Darovsky.
Credits: [Marc J. Schmidt](https://twitter.com/MarcJSchmidt) for ideas of handling element resize
