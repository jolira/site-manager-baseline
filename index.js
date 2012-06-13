/*jslint node: true, vars: true, indent: 4 */
(function (module) {
    "use strict";

    var path = require("path"),
        bootstrap = require("site-manager-bootstrap"),
        templates = path.join(__dirname, "templates"),
        pubdir = path.join(__dirname, "public");

    module.exports = function (defaults, cb) {
        [
            "js/libs/underscore/underscore-1.3.3.js",
            "js/libs/jquery/jquery-1.7.2.js",
            "js/libs/backbone/backbone-0.9.2.js",
            "js/libs/lawnchair-0.6.1.js",
            "js/app-starter.js"
        ].forEach(function (dir) {
                defaults.trailingScripts.push(dir);
            });
        [
            {
                "name":"HandheldFriendly",
                "content":"True"
            },
            {
                "name": "viewport",
                "content": "width=device-width,initial-scale=1.0,maximum-scale=1.0"
            },
            {
                "name":"apple-mobile-web-app-capable",
                "content":"yes"
            },
            {
                "name":"apple-mobile-web-app-status-bar-style",
                "content":"black"
            }
        ].forEach(function(meta){
                defaults.metas.push(meta);
            });
        [
            bootstrap,
            pubdir
        ].forEach(function(dir) {
                defaults["public"].unshift(dir);
            });
        defaults.links.push({
            rel: "apple-touch-startup-image",
            href: "startup.png"
        });
        defaults.useRequireJS = false;

        return cb(undefined, defaults);
    };
})(module);