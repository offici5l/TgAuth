const path              = require("path");
const webpack           = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtract    = require("mini-css-extract-plugin");

module.exports = {
  entry: "./src/app.js",

  output: {
    filename: "app.js",
    path:     path.resolve(__dirname, "docs"),
    clean:    true,
  },

  resolve: {
    fallback: {
      crypto:    require.resolve("crypto-browserify"),
      stream:    require.resolve("stream-browserify"),
      buffer:    require.resolve("buffer/"),
      process:   require.resolve("process/browser"),
      path:      require.resolve("path-browserify"),
      events:    require.resolve("events/"),
      http:      require.resolve("stream-http"),
      https:     require.resolve("https-browserify"),
      url:       require.resolve("url/"),
      zlib:      require.resolve("browserify-zlib"),
      util:      require.resolve("util/"),
      assert:    require.resolve("assert/"),
      os:        require.resolve("os-browserify/browser"),
      vm:        require.resolve("vm-browserify"),
      constants: require.resolve("constants-browserify"),
      fs: false, net: false, tls: false, dns: false, child_process: false,
    },
  },

  module: {
    rules: [
      {
        test: /\.css$/,
        use: [MiniCssExtract.loader, "css-loader"],
      },
    ],
  },

  plugins: [
    new webpack.ProvidePlugin({
      Buffer:  ["buffer", "Buffer"],
      process: "process/browser",
    }),
    new webpack.NormalModuleReplacementPlugin(
      /node-localstorage/,
      path.resolve(__dirname, "src/noop.js")
    ),
    new HtmlWebpackPlugin({
      template: "./src/index.html",
      inject:   false,
    }),
    new MiniCssExtract({ filename: "style.css" }),
  ],

  performance: { hints: false },
};
