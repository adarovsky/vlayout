import 'react-app-polyfill/ie11';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import App from './App';

const Example = () => {
  return (
    <div>
      <App />
    </div>
  );
};

ReactDOM.render(<Example />, document.getElementById('root'));
