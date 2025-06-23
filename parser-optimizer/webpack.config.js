const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = (env) => {
  // Check if we want readable output
  const isReadableOutput = env && env.readableOutput;
  
  return {
    mode: process.env.NODE_ENV || (isReadableOutput ? 'development' : 'production'),
    entry: './src/js/index.js',
    output: {
      filename: 'bundle.js',
      path: path.resolve(__dirname, 'dist'),
      publicPath: ''
    },
    resolve: {
      alias: {
        '@algorithms': path.resolve(__dirname, 'src/js/algorithms'),
        '@ffd': path.resolve(__dirname, 'src/js/algorithms/First-Fit-Decreasing'),
        '@ilp': path.resolve(__dirname, 'src/js/algorithms/Integer-Linear-Programming'),
        '@css': path.resolve(__dirname, 'src/css')
      },
      fallback: {
        "fs": false,
        "child_process": false,
        "path": false
      }
    },
    module: {
      rules: [
        {
          test: /\.css$/,
          use: [
            MiniCssExtractPlugin.loader, 
            'css-loader'
          ],
        },
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: ['@babel/preset-env']
            }
          }
        }
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
        // Only minify HTML in production mode
        minify: isReadableOutput ? false : {
          collapseWhitespace: true,
          removeComments: true,
          removeRedundantAttributes: true,
          removeScriptTypeAttributes: true,
          removeStyleLinkTypeAttributes: true,
          useShortDoctype: true
        }
      })
    ],
    // Control optimization based on readable output flag
    optimization: {
      minimize: !isReadableOutput
    },
    devServer: {
      static: {
        directory: path.join(__dirname, 'dist'),
      },
      compress: true,
      port: 9000,
      hot: true
    }
  };
};