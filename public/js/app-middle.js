(function (window, io, $, _, Backbone, Lawnchair, location, app) {
    "use strict";

    var DB = "store:",
        DEVICE = "device",
        SECURE = "{{secure}}" == "true",
        PORT = "{{port}}";

    app.middle = app.middle || {};

    _.extend(app.middle, Backbone.Events);

    function getServerURL() {
        var protocol = SECURE ? "https://" : "http://",
            port = PORT || location.port;

        if (port) {
            port = ":" + port;
        }

        return protocol + location.hostname + port;
    }

    function ready() {
        app.middle.trigger("connected", app.middle.id, app.middle.session)
        app.log("ready", app.middle.id, app.middle.session);
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

    function log(level, _args) {
        var args = Array.prototype.slice.call(_args),
            params = [
                "log",
                level,
                app.middle.id,
                app.middle.session,
                new Date()
            ];

        args.forEach(function (arg) {
            var param = convert(arg);

            params.push(param);
        });

        return app.middle.socket.emit.apply(app.middle.socket, params);
    }

    app.starter.$(function (next) {
        var url = getServerURL();

        app.middle.socket = io.connect(url);
        app.log = function () {
            return log("info", arguments);
        };
        app.debug = function () {
            return log("debug", arguments);
        };
        app.error = function () {
            return log("error", arguments);
        };

        new Lawnchair(function (store) {
            app.middle.store = store;
            store.get(DEVICE, function (device) {
                app.middle.id = device && device.id;
                app.middle.socket.on('ready', function (props) {
                    app.middle.session = props.session;
                    if (device) {
                        return ready();
                    }

                    return store.save({
                        key:DEVICE,
                        id:props.session
                    }, function (device) {
                        return ready();
                    });
                });

                return next();
            });
        });
    });

    // *******************************************************************************
    // using socket.io for Backbone.sync
    // *******************************************************************************

    // Helper function to get a value from a Backbone object as a property
    // or as a function.
    function getValue(object, prop) {
        var value = object && object[prop];

        if (!value) {
            return undefined;
        }

        return _.isFunction(value) ? value() : value;
    }

    function readAsync(model, segments, options) {
        var url = segments.join('/');

        return app.middle.store.get(DB + url, function (result) {
            return options && options.success && options.success(result && result.val);
        });
    }

    function updateLocal(model, segments, options, changed, url, data) {
        changed = changed || model.changedAttributes();

        if (!changed) {
            return;
        }

        url = url || segments.join('/');
        data = data || model.toJSON();

        return app.middle.store.save({
            key:DB + url,
            val:data
        }, function (result) {
            app.log("local update", result);
            return options && options.success && options.success(result);
        });
    }

    function updateRemote(model, segments, options, changed, url, data) {
        changed = changed || model.changedAttributes();

        if (!changed) {
            return;
        }

        url = url || segments.join('/');
        data = data || model.toJSON();

        return app.middle.socket.emit("store", url, data, changed, function (err, result) {
            if (err) {
                if (options && options.errror) {
                    return options.errror(err);
                }

                return app.error("sync failed", url, data, changed, err);
            }

            app.log("remote update", result);

            if (options && options.success) {
                return options.success(result);
            }
        });
    }

    function updateAsync(model, segments, options) {
        var changed = model.changedAttributes();

        if (!changed) {
            return;
        }

        var url = segments.join('/'),
            data = model.toJSON();

        updateRemote(model, segments, {}, changed, url, data);
        updateLocal(model, segments, options, changed, url, data);
    }

    function asyncSync(method, model, segments, options) {
        if ('read' === method) {
            return readAsync(model, segments, options);
        }

        if ("update" === method) {
            return updateAsync(model, segments, options);
        }

        throw new Error("not yet supported");
    }

    /**
     * Performs create, read, update, and delete operations.
     *
     * @param method create, read, update, and delete
     * @param model
     * @param options
     * @return {*}
     */
    Backbone.sync = function (method, model, options) {
        var url = model.url(),
            segments = url.split('/'),
            base = segments.shift();

        if (base === 'async') {
            return asyncSync(method, model, segments, options);
        }

        var data = model.toJSON(),
            changed = model.changedAttributes();

        app.middle.socket.emit("store", url, data, changed, function (err, result) {
            if (err) {
                if (options && options.errror) {
                    return options.errror(err);
                }

                return app.error("sync failed", url, data, changed, err);
            }

            if (options && options.success) {
                return options.success(result);
            }
        });

        return undefined;
    };
})(window, io, $, _, Backbone, Lawnchair, window.location, window["jolira-app"]);
