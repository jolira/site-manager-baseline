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

    function decorate(socket) {
        return {
            emit:emitter(socket)
        };
    }

    function connect(url, cb) {
        try {
            var socket = io.connect(url, {
                "reconnection limit":4001, // four second max delay
                "max reconnection attempts":Infinity
            });

            return cb(socket);
        }
        catch(e) {
            app.error("fail to connect", e);

            setTimeout(function() {
                connect(url, cb);
            }, 1000);
        }
    }

    app.starter.$(function (next) {
        app.store("middle", function (store) {
            store.get(ID, function (device) {
                app.middle.id = (device && device.id) || app.utils.uuid();

                if (!device) {
                    store.save(ID, app.middle.id);
                }

                var url = getServerURL(),
                    app_log = app.log,
                    app_debug = app.debug,
                    app_error = app.error;

                return connect(url, function(socket) {
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
    });
})(window, window.io, $, _, Backbone, window.location, window["jolira-app"]);
