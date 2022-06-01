const webpack = require('webpack');
const path = require('path');

const library = 'serializeError';

module.exports = {
  mode: 'production',
  entry: './dist/cjs/index.js',
  output: {
    filename: 'index.js',
    path: path.resolve(__dirname, 'dist/browser'),
    library,
    libraryTarget: 'umd',
  },
  plugins: [],
  resolve: {
    fallback: {
      'stream': false
    },
  },
};
