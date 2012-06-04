/*jslint node: true, vars: true, indent: 4 */
(function (module) {
    "use strict";

    var path = require("path"),
        templates = path.join(__dirname, "templates"),
        pubdir = path.join(__dirname, "public"),
        twitterbootstrap = require("site-manager-bootstrap");

    module.exports = function (defaults, cb) {
        [
            "js/libs/underscore/underscore-1.3.3.js",
            "js/libs/jquery/jquery-1.7.2.js",
            "js/libs/backbone/backbone-0.9.2.js",
            "js/bootstrap-dropdown.js",
            "js/app-starter.js"
        ].forEach(function (dir) {
                defaults.tailingScripts.push(dir);
            });
        defaults.useRequireJS = false;

        return cb(undefined, defaults);
    };
})(module);