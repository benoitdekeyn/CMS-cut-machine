const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: process.env.NODE_ENV || 'development',
  entry: './src/js/index.js',
  output: {
    filename: 'bundle.js',
    path: process.env.NODE_ENV === 'production' 
      ? path.resolve(__dirname, '../web-files')
      : path.resolve(__dirname, 'dist'),
    publicPath: './' // IMPORTANT pour Electron
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
      },
      {
        test: /\.(png|jpg|jpeg|gif|ico|svg)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'assets/[name][ext]'
        }
      }
    ],
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: 'main.css',
    }),
    new HtmlWebpackPlugin({
      template: './src/index.html',
      filename: 'index.html',
      inject: 'body',
      minify: process.env.NODE_ENV === 'production' ? {
        collapseWhitespace: true,
        removeComments: true,
        removeRedundantAttributes: true,
        removeScriptTypeAttributes: true,
        removeStyleLinkTypeAttributes: true,
        useShortDoctype: true
      } : false
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'src/assets',
          to: 'assets',
          noErrorOnMissing: true
        }
      ]
    })
  ],
  optimization: {
    minimize: process.env.NODE_ENV === 'production'
  },
  devServer: {
    static: {
      directory: path.join(__dirname, 'dist'),
      publicPath: '/'
    },
    compress: true,
    port: 9000,
    hot: true,
    devMiddleware: {
      writeToDisk: true
    },
  }
};