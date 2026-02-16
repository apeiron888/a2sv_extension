const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'production',
  entry: {
    background: './src/background.js',
    leetcode: './src/content/leetcode.js',
    codeforces: './src/content/codeforces.js',
    popup: './src/popup/popup.js',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'manifest.json', to: 'manifest.json' },
        { from: 'icons', to: 'icons' },
        { from: 'src/popup/popup.html', to: 'popup.html' },
        { from: 'src/popup/popup.css', to: 'popup.css' },
        { from: 'src/content/inject.css', to: 'inject.css' },
        { from: 'src/content/fallback.html', to: 'fallback.html' },
        { from: 'src/pages', to: 'pages' },
      ],
    }),
  ],
};