(function (window, io, $, _, Backbone, Lawnchair, location, app) {
    "use strict";

    var ID = "id",
        SECURE = "{{secure}}" == "true",
        PORT = "{{port}}",
        watchedEvents = {},
        socket;

    app.middle = app.middle || {};

    // *******************************************************************************
    // using socket.io for Backbone.sync
    // *******************************************************************************

    function open(name, cb) {
        new Lawnchair({ name:name }, cb);
    }

    function changedAttributes(model) {
        var changed = model.changedAttributes()

        return changed && _.keys(changed);
    }

    function readAsync(collection, id, options) {
        return open(collection, function (store) {
            if (id) {
                return store.get(id, function (result) {
                    return options && options.success && options.success(result && result.val);
                });
            }

            return store.all(function (result) {
                if (!options || !options.success) {
                    return;
                }

                var found = [];

                _.each(result || [], function (result) {
                    found.push(result.val);
                });

                return options.success(found);
            });
        });
    }

    function saveLocal(model, collection, id, options, changed, data) {
        changed = changed || changedAttributes(model);

        if (!changed) {
            return;
        }

        return open(collection, function (store) {
            data = data || model.toJSON();

            return store.save({
                key:id,
                val:data
            }, function (result) {
                app.log("saving locally", collection, result, changed);
                return options && options.success && options.success(result.val);
            });
        });
    }

    function saveRemote(method, model, collection, id, options, changed, data) {
        changed = changed || changedAttributes(model);

        if (!changed) {
            return;
        }

        data = data || model.toJSON();

        return app.middle.emit("middle-store", method, collection, id, data, changed, function (err, result) {
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

    function saveAsync(method, model, collection, id, options, changed, data) {
        changed = changed || changedAttributes(model);

        if (!changed) {
            return;
        }

        data = data || model.toJSON();

        saveRemote(method, model, collection, id, undefined, changed, data);
        saveLocal(model, collection, id, options, changed, data);
    }

    function createAsync(method, model, collection, id, options) {
        var data = model.toJSON() || {};

        data.id = app.utils.uuid().replace(/-/g, "");

        saveAsync(method, model, collection, data.id, options, _.keys(data), data);
    }

    function asyncSync(method, model, collection, id, options) {
        if ('read' === method) {
            return readAsync(collection, id, options);
        }

        if ("update" === method) {
            return saveAsync(method, model, collection, id, options);
        }

        if ("create" === method) {
            return createAsync(method, model, collection, id, options);
        }
        throw new Error("not yet supported");
    }

    function getURL(model) {
        return _.isFunction(model.url) ? model.url.call(model) : model.url;
    }

    app.middle.sync = function (method, model, options) {
        var url = getURL(model),
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

        _.each(args, function (arg) {
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
        new Lawnchair({ name:"middle" }, function (store) {
            store.get(ID, function (device) {
                app.middle.id = (device && device.id) || app.utils.uuid();

                if (!device) {
                    store.save({
                        key:ID,
                        id:app.middle.id
                    });
                }

                var url = getServerURL(),
                    app_log = app.log,
                    app_debug = app.debug,
                    app_error = app.error;

                socket = io.connect(url, {
                    "reconnection limit":4001, // four second max delay
                    "max reconnection attempts":Infinity
                });

                app.middle.bind = app.middle.on = app.middle.on || function (event, callback, context) {
                    var events = event.split(/\s+/);

                    _.each(events, function (event) {
                        if (!watchedEvents[event]) {
                            watchedEvents[event] = true;
                            socket.on(event, function () {
                                var args = Array.prototype.slice.call(arguments);

                                args.unshift(event);

                                return app.middle.trigger.apply(app.middle, args);
                            });
                        }
                    });

                    Backbone.Events.on.call(app.middle, event, callback, context);
                }
                app.middle.unbind = app.middle.off = app.middle.off || function () {
                    Backbone.Events.off.apply(app.middle, arguments);
                }
                app.middle.trigger = app.middle.trigger = app.middle.trigger || function () {
                    Backbone.Events.trigger.apply(app.middle, arguments);
                }
                app.middle.emit = emitter(socket);

                var decorated = decorate(socket, store);

                socket.on('error', function (err) {
                    return app.error("socket error", err);
                });
                socket.on('connecting', function () {
                    return app.log("connecting");
                });
                socket.on('connect_failed', function (err) {
                    return app.error("connect_failed", err);
                });
                socket.on('reconnect', function () {
                    return app.log("reconnect");
                });
                socket.on('reconnecting', function (err) {
                    return app.log("reconnecting");
                });
                socket.on('connect', function (props) {
                    app.middle.connected = true;

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
                    app.middle.trigger("connect", app.middle.id)

                    return app.log("connected");
                });
                socket.on('disconnect', function (props) {
                    app.middle.connected = false;

                    app.log = app_log;
                    app.debug = app_debug;
                    app.error = app_error;
                    app.middle.trigger("disconnect", app.middle.id)

                    return app.log("disconnected", app.middle.id);
                });

                return next();
            });
        });
    });
})(window, window.io, $, _, Backbone, Lawnchair, window.location, window["jolira-app"]);
