module.exports = {
  entry: "./src/gocept/jsform/resources/jsform.js",
  output: {
      path: __dirname + "/src/gocept/jsform/resources/",
      filename: "build.js"
  },
  module: {
      loaders: [
          { test: /\.pt$/, loader: "html" }
      ]
  }
};
