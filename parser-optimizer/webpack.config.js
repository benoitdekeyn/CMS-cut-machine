const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: process.env.NODE_ENV || 'development',
  entry: './src/js/index.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
    publicPath: ''  // This is important for asset paths
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
      // This is the key change for handling assets in dev mode
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
    // Make sure assets are copied
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
      publicPath: '/' // This ensures paths start from root in dev mode
    },
    compress: true,
    port: 9000,
    hot: true,
    devMiddleware: {
      writeToDisk: true // This writes files to disk, helpful for debugging
    },
  }
};