(function (window, io, $, _, Backbone, Lawnchair, location, app) {
    "use strict";

    var ID = "id",
        SECURE = "{{secure}}" == "true",
        PORT = "{{port}}";

    app.middle = app.middle || {};

    _.extend(app.middle, Backbone.Events);

    // *******************************************************************************
    // using socket.io for Backbone.sync
    // *******************************************************************************

    function open(name, cb) {
        new Lawnchair({ name: name }, cb);
    }

    function readAsync(collection, id, options) {
        return open(collection, function(store) {
            return store.get(id, function (result) {
                return options && options.success && options.success(result && result.val);
            });
        });
    }

    function saveLocal(model, collection, id, options, changed, data) {
        changed = changed || model.changedAttributes();

        if (!changed) {
            return;
        }

        return open(collection, function(store) {
            data = data || model.toJSON();

            return store.save({
                key:id,
                val:data
            }, function (result) {
                app.log("local update", collection, result, changed);
                return options && options.success && options.success(result.val);
            });
        });
    }

    function saveRemote(method, model, collection, id, options, changed, data) {
        changed = changed || model.changedAttributes();

        if (!changed) {
            return;
        }

        data = data || model.toJSON();

        return app.middle.emit("middle-store", method, app.middle.auth, id, data, changed, function (err, result) {
            if (err) {
                if (options && options.errror) {
                    return options.errror(err);
                }

                return app.error("sync failed", collection, id, data, changed, err);
            }

            app.log("remote update", result);

            if (options && options.success) {
                return options.success(result);
            }
        });
    }

    function saveAsync(method, model, collection, id, options) {
        var changed = model.changedAttributes();

        if (!changed) {
            return;
        }

        var data = model.toJSON();

        saveRemote(method, model, collection, id, undefined, changed, data);
        saveLocal(model, collection, id, options, changed, data);
    }

    function asyncSync(method, model, collection, id, options) {
        if ('read' === method) {
            return readAsync(collection, id, options);
        }

        if ("update" === method || "create" === method) {
            return saveAsync(method, model, collection, id, options);
        }

        throw new Error("not yet supported");
    }

    app.middle.sync = function (method, model, options) {
        var url = model.url(),
            segments = url.split('/'),
            type = segments.shift(),
            collection = segments.shift(),
            id = segments.join('/');

        if (type === 'async') {
            return asyncSync(method, model, collection, id, options);
        }

        throw new Error("unsupported url " + url);
    };

    // *******************************************************************************
    // Starting connections. loading device id, etc.
    // *******************************************************************************

    function getServerURL() {
        var protocol = SECURE ? "https://" : "http://",
            port = PORT || location.port;

        if (port) {
            port = ":" + port;
        }

        return protocol + location.hostname + port;
    }

    function convert(arg) {
        try {
            return JSON.stringify(arg);
        }
        catch (e) {
            var simpified = {};

            _.each(arg, function (entry, key) {
                if (entry !== window) {
                    simpified[key] = entry;
                }
            });

            return convert(simpified);
        }
    }

    function log(socket, level, _args) {
        var args = Array.prototype.slice.call(_args),
            params = [
                "log",
                level,
                new Date()
            ];

        args.forEach(function (arg) {
            var param = convert(arg);

            params.push(param);
        });

        return socket.emit.apply(socket, params);
    }

    function emitter(socket) {
        return function () {
            return socket.emit.apply(socket, arguments);
        };
    }

    function decorate(socket) {
        return {
            emit:emitter(socket)
        };
    }

    app.starter.$(function (next) {
        new Lawnchair({ name: "middle" }, function (store) {
            store.get(ID, function (device) {
                app.middle.id = (device && device.id) || app.utils.uuid();

                if (!device) {
                    store.save({
                        key:ID,
                        id:app.middle.id
                    });
                }

                var url = getServerURL(),
                    socket = io.connect(url),
                    app_log = app.log,
                    app_debug = app.debug,
                    app_error = app.error;

                app.middle.emit = emitter(socket);

                var decorated = decorate(socket, store);

                socket.on('connect', function (props) {
                    socket.emit("middle-initialize", app.middle.id);

                    app.log = function () {
                        return log(socket, "info", arguments);
                    };
                    app.debug = function () {
                        return log(socket, "debug", arguments);
                    };
                    app.error = function () {
                        return log(socket, "error", arguments);
                    };
                    app.middle.trigger("online", app.middle.id)
                    app.log("online");
                });
                socket.on('disconnect', function (props) {
                    app.log = app_log;
                    app.debug = app_debug;
                    app.error = app_error;
                    app.middle.trigger("offline", app.middle.id)
                    app.log("offline", app.middle.id);
                });

                return next();
            });
        });
    });
})(window, window.io, $, _, Backbone, Lawnchair, window.location, window["jolira-app"]);
