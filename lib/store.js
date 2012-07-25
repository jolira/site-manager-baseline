/*jslint node: true, vars: true, indent: 4 */
(function (module) {
    "use strict";

    var mongodb = require("mongodb"),
        URL = /mongodb:\/\/([^:\/]+)(?::(\d+))?\/([\w\d.-_]+)/;

    function getOpts(logger, lopts, gopts) {
        var mongodb = lopts.mongodb || gopts.mongodb;

        if (!mongodb) {
            return undefined;
        }

        var parsed = mongodb.match(URL);

        if (!parsed) {
            return undefined;
        }

        return {
            host:parsed[1],
            port:parseInt(parsed[2]) || 27017,
            name:parsed[3],
            serverOptions:{auto_reconnect:true, poolSize:4},
            dbOptions:{}
        };
    }

    module.exports = function (logger, lopts, gopts, cb) {
        var opts = getOpts(logger, lopts, gopts);

        if (!opts) {
            return cb(new Error("mongodb not defined in the options"));
        }

        var server = mongodb.Server(opts.host, opts.port, opts.serverOptions),
            connector = new mongodb.Db(opts.name, server, opts.dbOptions);

        return connector.open(function (err, db) {
            if (err) {
                return cb(err);
            }

            return cb(undefined, {
                "middle-store":function (method, collection, id, data, changed, cb) {
                    logger.info("middle-store", method, collection, id, data, changed);

                    return db.collection(collection, function (err, collection) {
                        if (err) {
                            return cb(err);
                        }

                        var vals = {},
                            criteria = {
                                _id:id
                            };

                        changed.forEach(function (key) {
                            vals[key] = data[key];
                        });

                        collection.update(criteria, {
                                $set:vals
                            },
                            {
                                upsert:true,
                                safe:true
                            }, function (err, result) {
                                if (err) {
                                    cb(err);
                                }

                                collection.findOne(criteria, function(err, result) {
                                    if (err) {
                                        cb(err);
                                    }

                                    delete result._id;

                                    result["id"] = id;

                                    return cb(undefined, result);
                                });
                            });
                    });
                }
            });
        });
    };
})(module);