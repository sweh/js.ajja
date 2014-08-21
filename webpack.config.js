module.exports = {
    entry: "./src/gocept/jsform/resources/jsform.js",
    output: {
        path: __dirname + "/src/gocept/jsform/resources/",
        filename: "build.js"
    },
    module: {
        loaders: [
            { test: /\.pt$/, loader: "html" },
            {
                test: /json-template\.js/,
                loader: "imports?exports=>{}!exports?exports"
            },
            { test: /ko\.mapping\.js/, loader: "imports?this=>{}" },
            { test: /classy\.js/, loader: "imports?this=>{}" }
        ]
    }
};
