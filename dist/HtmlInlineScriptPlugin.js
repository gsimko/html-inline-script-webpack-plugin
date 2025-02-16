var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "path", "webpack", "html-webpack-plugin", "./constants"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var path_1 = __importDefault(require("path"));
    var webpack_1 = require("webpack");
    var html_webpack_plugin_1 = __importDefault(require("html-webpack-plugin"));
    var constants_1 = require("./constants");
    var HtmlInlineScriptPlugin = /** @class */ (function () {
        function HtmlInlineScriptPlugin(options) {
            if (options === void 0) { options = {}; }
            if (options && Array.isArray(options)) {
                // eslint-disable-next-line no-console
                console.error('\x1b[35m%s \x1b[31m%s %s\x1b[0m', '[html-inline-script-webpack-plugin]', 'Options is now an object containing `scriptMatchPattern` and `htmlMatchPattern` in version 3.x.', 'Please refer to documentation for more information.');
                throw new Error('OPTIONS_PATTERN_UNMATCHED');
            }
            var _a = options.scriptMatchPattern, scriptMatchPattern = _a === void 0 ? [/.+[.]js$/] : _a, _b = options.htmlMatchPattern, htmlMatchPattern = _b === void 0 ? [/.+[.]html$/] : _b, _c = options.assetPreservePattern, assetPreservePattern = _c === void 0 ? [] : _c;
            this.scriptMatchPattern = scriptMatchPattern;
            this.htmlMatchPattern = htmlMatchPattern;
            this.processedScriptFiles = [];
            this.assetPreservePattern = assetPreservePattern;
            this.ignoredHtmlFiles = [];
        }
        HtmlInlineScriptPlugin.prototype.isFileNeedsToBeInlined = function (assetName) {
            return this.scriptMatchPattern.some(function (test) { return assetName.match(test); });
        };
        HtmlInlineScriptPlugin.prototype.isFileNeedsToBePreserved = function (assetName) {
            return this.assetPreservePattern.some(function (test) { return assetName.match(test); });
        };
        HtmlInlineScriptPlugin.prototype.shouldProcessHtml = function (templateName) {
            return this.htmlMatchPattern.some(function (test) { return templateName.match(test); });
        };
        HtmlInlineScriptPlugin.prototype.processScriptTag = function (publicPath, assets, tag) {
            var _a;
            if (tag.tagName !== 'script' || !((_a = tag.attributes) === null || _a === void 0 ? void 0 : _a.src)) {
                return tag;
            }
            // Decoded is needed for special characters in filename like '@' since they will be escaped
            var scriptName = decodeURIComponent(tag.attributes.src.replace(publicPath, ''));
            if (!this.isFileNeedsToBeInlined(scriptName)) {
                return tag;
            }
            var asset = assets[scriptName];
            if (!asset) {
                return tag;
            }
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var _b = tag.attributes, src = _b.src, defer = _b.defer, attributesWithoutSrcDefer = __rest(_b, ["src", "defer"]);
            this.processedScriptFiles.push(scriptName);
            return {
                tagName: 'script',
                // escape '</script>' appears in source
                innerHTML: asset.source().replace(/(<)(\/script>)/g, '\\x3C$2'),
                voidTag: false,
                attributes: attributesWithoutSrcDefer,
                meta: { plugin: 'html-inline-script-webpack-plugin' }
            };
        };
        HtmlInlineScriptPlugin.prototype.getPublicPath = function (compilation, htmlFileName, customPublicPath) {
            var webpackPublicPath = compilation.getAssetPath(compilation.outputOptions.publicPath, { hash: compilation.hash });
            // Webpack 5 introduced "auto" as default value
            var isPublicPathDefined = webpackPublicPath !== 'auto';
            var publicPath = '';
            if (customPublicPath !== 'auto') {
                // If the html-webpack-plugin options contain a custom public path uset it
                publicPath = customPublicPath;
            }
            else if (isPublicPathDefined) {
                // If a hard coded public path exists in webpack config use it
                publicPath = webpackPublicPath;
            }
            else if (compilation.options.output.path) {
                // If no public path for webpack and html-webpack-plugin was set get a relative url path
                publicPath = path_1.default.relative(path_1.default.resolve(compilation.options.output.path, path_1.default.dirname(htmlFileName)), compilation.options.output.path).split(path_1.default.sep).join('/');
            }
            if (publicPath && !publicPath.endsWith('/')) {
                publicPath += '/';
            }
            return publicPath;
        };
        HtmlInlineScriptPlugin.prototype.apply = function (compiler) {
            var _this = this;
            compiler.hooks.compilation.tap("".concat(constants_1.PLUGIN_PREFIX, "_compilation"), function (compilation) {
                var hooks = html_webpack_plugin_1.default.getHooks(compilation);
                hooks.alterAssetTags.tap("".concat(constants_1.PLUGIN_PREFIX, "_alterAssetTags"), function (data) {
                    var _a;
                    var htmlFileName = (_a = data.plugin.options) === null || _a === void 0 ? void 0 : _a.filename;
                    var publicPath = _this.getPublicPath(compilation, data.outputName, data.publicPath);
                    if (htmlFileName && !_this.shouldProcessHtml(htmlFileName)) {
                        _this.ignoredHtmlFiles.push(htmlFileName);
                        return data;
                    }
                    data.assetTags.scripts = data.assetTags.scripts.map(function (tag) { return _this.processScriptTag(publicPath, compilation.assets, tag); });
                    return data;
                });
                compilation.hooks.processAssets.tap({
                    name: "".concat(constants_1.PLUGIN_PREFIX, "_PROCESS_ASSETS_STAGE_SUMMARIZE"),
                    stage: webpack_1.Compilation.PROCESS_ASSETS_STAGE_SUMMARIZE
                }, function (assets) {
                    if (_this.ignoredHtmlFiles.length === 0) {
                        _this.processedScriptFiles.forEach(function (assetName) {
                            if (!_this.isFileNeedsToBePreserved(assetName)) {
                                delete assets[assetName];
                            }
                        });
                    }
                });
            });
        };
        return HtmlInlineScriptPlugin;
    }());
    exports.default = HtmlInlineScriptPlugin;
});
