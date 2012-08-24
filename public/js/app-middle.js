(function (window, io, $, _, Backbone, location, app) {
    "use strict";

    var ID = "id",
        SECURE = "{{secure}}" == "true",
        PORT = "{{port}}",
        watchedEvents = {};

    app.middle = app.middle || {};

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

    function connect(url, cb) {
        try {
            return cb(io.connect(url, {
                "reconnection limit":4001, // four second max delay
                "max reconnection attempts":Infinity,
                "force new connection": true
            }));
        }
        catch(e) {
            setTimeout(function() {
                connect(url, cb);
            }, 500);

            return app.error("io.connect exception", e);
        }
    }

    function openSocket(cb) {
        var tryAgain = function() {
                if (cb) {
                    app.log("middle trying to connect again");
                    setTimeout(function() {
                        openSocket(cb);
                    }, 500);
                }
            },
            app_log = app.log,
            app_debug = app.debug,
            app_error = app.error,
            url = getServerURL();

        return connect(url, function(socket) {
            socket.on('error', function (err) {
                app.error("middle socket error", err);
                tryAgain();
            });
            socket.on('connecting', function () {
                return app.log("middle connecting");
            });
            socket.on('connect_failed', function (err) {
                app.error("connect_failed", err);
                tryAgain();
            });
            socket.on('reconnect', function () {
                return app.log("middle reconnect");
            });
            socket.on('reconnecting', function () {
                return app.log("middle reconnecting");
            });
            socket.on('connect', function () {
                app.middle.connected = true;

                var _cb = cb;

                cb = undefined;

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

                app.log("middle connected");

                return _cb && _cb(socket);
            });
            socket.on('disconnect', function () {
                app.middle.connected = false;

                app.log = app_log;
                app.debug = app_debug;
                app.error = app_error;
                app.middle.trigger("disconnect", app.middle.id);

                return app.log("disconnected", app.middle.id);
            });
        });
    }

    app.starter.$(function (next) {
        app.store("middle", function (store) {
            store.get(ID, function (device) {
                app.middle.id = (device && device.id) || app.utils.uuid();

                if (!device) {
                    store.save(ID, app.middle.id);
                }

                return openSocket(function(socket) {
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
                    };
                    app.middle.unbind = app.middle.off = app.middle.off || function () {
                        Backbone.Events.off.apply(app.middle, arguments);
                    };
                    app.middle.trigger = app.middle.trigger = app.middle.trigger || function () {
                        Backbone.Events.trigger.apply(app.middle, arguments);
                    };
                    app.middle.emit = emitter(socket);

                    return next();
                });
            });
        });
    });
})(window, window.io, $, _, Backbone, window.location, window["jolira-app"]);
