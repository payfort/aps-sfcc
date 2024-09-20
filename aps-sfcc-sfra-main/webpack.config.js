'use strict';

const path = require("path");
const fse = require("fs-extra");
const glob = require("glob");
const minimatch = require("minimatch");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const UglifyJsPlugin = require("uglifyjs-webpack-plugin");
const CleanWebpackPlugin = require("clean-webpack-plugin");
const sassJsonImporter = require("node-sass-json-importer");
const webpack = require('webpack');

const ALIASES = {
    base: path.resolve(__dirname, "cartridges", "app_storefront_base", "cartridge", "client", "default"),
    int_aps_sfra: path.resolve(__dirname, "cartridges", "int_aps_sfra", "cartridge", "client", "default")
};

class PostBuildCleanUp {
    // Define `apply` as its prototype method which is supplied with compiler as its argument
    apply(compiler) {
        // Specify the event hook to attach to
        compiler.hooks.emit.tapAsync('PostCleanUpAssets', (compilation, callback) => {
            Object.keys(compilation.assets)
                .filter(asset => {
                    return ["*/css/**/*.js", "*/css/**/*.js.map"].some(pattern => {
                        return minimatch(asset, pattern);
                    });
                })
                .forEach(asset => {
                    delete compilation.assets[asset];
                });
            callback();
        });
    }
}

class WebpackBundle {
    static forCartridge(cartridgeName) {

        const devMode = process.env.NODE_ENV !== "production";
        const cartridgesPath = path.resolve(__dirname, "cartridges");

        const clientPath = path.resolve(cartridgesPath, cartridgeName, "cartridge/client");
        if (!fse.existsSync(clientPath)) {
            return;
        }
        var bundles = [];
        const jsBundle = {}, scssBundle = {};
        jsBundle.entry = {};
        scssBundle.entry = {};

        glob.sync(path.resolve(clientPath, "*", "js", "*.js")).forEach(f => {
            const key = path.join(path.dirname(path.relative(clientPath, f)), path.basename(f, ".js"));
            jsBundle.entry[key] = f;
        });

        glob.sync(path.resolve(clientPath, "*", "scss", "**", "*.scss"))
            .filter(f => !path.basename(f).startsWith("_"))
            .forEach(f => {
                const key = path.join(path.dirname(path.relative(clientPath, f)).replace('scss', 'css'), path.basename(f, ".scss"));
                scssBundle.entry[key] = f;
            });
        var output = {
            path: path.resolve(cartridgesPath, cartridgeName, "cartridge/static")
        };

        jsBundle.output = output;
        scssBundle.output = output;
        // JS bundle module
        jsBundle.module = {
            rules: [
                {
                    test: /\.(js|jsx)$/,
                    use: ['cache-loader',
                        {
                            loader: "babel-loader",
                            options: {
                                compact: false,
                                babelrc: false,
                                presets: ["@babel/preset-env"],
                                plugins: [
                                    "@babel/plugin-proposal-object-rest-spread"
                                ],
                                cacheDirectory: true
                            }
                        }
                    ]
                }
            ]
        };

        //SCSS bundle module

        scssBundle.module = {
            rules: [
                {
                    test: /\.(sa|sc|c)ss$/,
                    use: [MiniCssExtractPlugin.loader,
                    { loader: "css-loader", options: { url: false, sourceMap: devMode } },
                    {
                        loader: 'postcss-loader', // Run post css actions
                        options: {
                            plugins: function () { // post css plugins, can be exported to postcss.config.js
                                return [
                                    require('autoprefixer')({
                                        remove: false
                                    })
                                ];
                            }
                        }
                    },
                    {
                        loader: "sass-loader",
                        options: {
                            importer: sassJsonImporter(),
                            includePaths: [
                                path.resolve(__dirname, "node_modules"),
                                path.resolve(__dirname, "node_modules", "flag-icon-css", "sass")
                            ],
                            sourceMap: devMode
                        }
                    }
                    ]
                }
            ]
        };
        var jsBundleAlias = {};
        var scssBundleAlias = {};
        Object.keys(ALIASES).forEach((key) => {
            jsBundleAlias[key] = path.resolve(ALIASES[key], "js");
            scssBundleAlias[key] = path.resolve(ALIASES[key], "scss");
        });
        jsBundle.resolve = {
            modules: ["node_modules", path.resolve(__dirname, "cartridges")],
            alias: jsBundleAlias
        };

        scssBundle.resolve = {
            modules: ["node_modules", path.resolve(__dirname, "cartridges")],
            alias: scssBundleAlias
        };

        jsBundle.plugins = [
            new CleanWebpackPlugin(["static/**/js"], {
                root: path.resolve(cartridgesPath, cartridgeName, "cartridge"),
                verbose: true
            }),
            new webpack.ContextReplacementPlugin(/moment[/\\]locale$/, /(en-gb|ar|ar-sa|ar-kw)\.js/)
        ];

        scssBundle.plugins = [
            new CleanWebpackPlugin(["static/**/css"], {
                root: path.resolve(cartridgesPath, cartridgeName, "cartridge"),
                verbose: true
            }),
            new MiniCssExtractPlugin({
                filename: "[name].css"
            }),
            new PostBuildCleanUp()
        ];


        if (devMode) {
            jsBundle.mode = "development";
            jsBundle.devtool = "cheap-module-eval-source-map";
            scssBundle.mode = "development";
            scssBundle.devtool = "cheap-module-eval-source-map";
        } else {
            jsBundle.mode = "production";
            jsBundle.devtool = false;
            jsBundle.optimization = {
                minimizer: [
                    new UglifyJsPlugin({
                        cache: true,
                        parallel: true,
                        sourceMap: false
                    })
                ]
            };
            scssBundle.mode = "production";
            scssBundle.devtool = false;
        }

        jsBundle.performance = { hints: false };
        scssBundle.performance = { hints: false };
        if (Object.keys(jsBundle.entry).length) {
            bundles.push(jsBundle);
        }
        if (Object.keys(scssBundle.entry).length) {
            bundles.push(scssBundle);
        }
        return bundles;
    }
}

/**
 * Add cartridges to CARTRIDGES_TO_BUILD
 * If plugin_ cartridge is added to project and has JS, SCSS add ALIAS for front end build if one of brand cartridges or refapp requires it.
 */
const CARTRIDGES_TO_BUILD = [
    "int_aps_sfra",
    "app_storefront_base"
];
const PIPELINES = [];

CARTRIDGES_TO_BUILD.forEach((cartridge) => {
    WebpackBundle.forCartridge(cartridge).forEach((bundle) => {
        PIPELINES.push(bundle);
    });
});

module.exports = PIPELINES;
