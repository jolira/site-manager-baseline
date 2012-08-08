/*jslint node: true, vars: true, indent: 4 */
(function (module) {
    "use strict";

    var path = require("path"),
        bootstrap = require("site-manager-bootstrap"),
        templates = path.join(__dirname, "templates"),
        pubdir = path.join(__dirname, "public"),
        clientInit = require("./lib/client-init"),
        clientLogger = require("./lib/client-logger"),
        dispatcher = require("./lib/dispatcher");

    function addDefaults(defaults) {
        [
            // 3rd party libraries
            "socket.io/socket.io.js",
            "js/libs/underscore/underscore-1.3.3.js",
            "js/libs/jquery/jquery-1.7.2.js",
            "js/libs/backbone/backbone-0.9.2.js",
            "js/libs/lawnchair/lawnchair-0.6.1.js",
            // "js/libs/lawnchair/webkit-sqlite-0.6.1.js",
            // buggy: "js/libs/lawnchair/indexed-db-0.6.1.js",
            "js/bootstrap-collapse.js",
            // local stuff
            "js/app-utils.js",
            "js/app-starter.js",
            "js/app-middle.js",
            "js/app-backbone.js",
            "js/app-container.js",
            "js/app-menu.js"
        ].forEach(function (dir) {
                defaults.trailingScripts.push(dir);
            });
        [
            {
                "name":"HandheldFriendly",
                "content":"True"
            },
            {
                "name":"viewport",
                "content":"width=device-width,initial-scale=1.0,maximum-scale=1.0"
            },
            {
                "name":"apple-mobile-web-app-capable",
                "content":"yes"
            },
            {
                "name":"apple-mobile-web-app-status-bar-style",
                "content":"black"
            }
        ].forEach(function (meta) {
                defaults.metas.push(meta);
            });
        [
            bootstrap,
            pubdir
        ].forEach(function (dir) {
                defaults["public"].unshift(dir);
            });
        defaults.htmlFiles = [
            path.join(templates, "container.html")
        ];
        defaults.templateFiles = [
            path.join(templates, "menu.html")
        ];
        [
            "img/glyphicons-halflings.png",
            "img/glyphicons-halflings-white.png"
        ].forEach(function (file) {
                defaults.manifest.push(file);
            });
        defaults.links.push({
            rel:"apple-touch-startup-image",
            href:"startup.png"
        });
        defaults.useRequireJS = false;
    }

    module.exports = function (defaults, app, lopts, gopts, cb) {
        dispatcher(defaults, app, lopts, gopts, function (err, dispatcher) {
            dispatcher.on(clientLogger(app.logger));
            dispatcher.on(clientInit(app.logger));
            addDefaults(defaults);

            return cb(undefined, defaults, dispatcher);
        });
    };
})(module);