/*jslint node: true, vars: true, indent: 4 */
(function (module) {
    "use strict";

    var mongodb = require("mongodb"),
        URL = /mongodb:\/\/([\w\d.-_]+)(?::(\d+))?\/([\w\d.-_]+)/;

    module.exports = function (logger, gopts, lopts, cb) {
        var opts = getOpts(logger, gopts, lopts),
            server = mongodb.Server(opts.host, opts.port, opts.serverOptions),
            connector = new mongodb.Db(opts.name, server, opts.dbOptions);

        return connector.open(function(err, db) {
            if (err) {
                return cb(err);
            }

            return cb(undefined, {
                "store-update": function(url, data, changed, cb) {
                }
            });
        });
    };
})(module);