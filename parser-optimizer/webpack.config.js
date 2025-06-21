const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const HtmlInlineScriptPlugin = require('html-inline-script-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const HtmlInlineCssPlugin = require('html-inline-css-webpack-plugin').default;
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: process.env.NODE_ENV || 'production',
  entry: './src/js/index.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
  resolve: {
    alias: {
      // Chemins corrigés pour pointer vers le bon dossier
      '@algorithms': path.resolve(__dirname, 'src/js/algorithms'),
      '@ffd': path.resolve(__dirname, 'src/js/algorithms/First-Fit-Decreasing'),
      '@ilp': path.resolve(__dirname, 'src/js/algorithms/Integer-Linear-Programming')
    },
    fallback: {
      // Mocks pour les modules Node.js
      "fs": false,
      "child_process": false,
      "path": false
    }
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader'],
      },
    ],
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: '[name].css',
    }),
    new HtmlWebpackPlugin({
      template: './src/index.html',
      filename: 'index.html',
      inject: 'body',
    }),
    new HtmlInlineScriptPlugin(),
    new HtmlInlineCssPlugin(),
  ],
};