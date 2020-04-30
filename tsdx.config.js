const postcss = require('rollup-plugin-postcss');
// const css = require ('rollup-plugin-css-only');

module.exports = {
  rollup(config, options) {
    config.plugins.push(
      postcss({
      })
    );
    return config;
  },
};
