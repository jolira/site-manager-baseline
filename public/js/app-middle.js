(function (io, $, _, Backbone, Lawnchair, location, app) {
    "use strict";

    var DEVICE = "device",
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
        catch(e) {
            return "<<circular>>"
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

        args.forEach(function(arg) {
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

    /**
     * Performs create, read, update, and delete operations.
     *
     * @param method create, read, update, and delete
     * @param model
     * @param options
     * @return {*}
     */
    Backbone.sync = function (method, model, options) {
        // Default options, unless specified.
        options || (options = {});

        var url = getValue(model, 'url'),
            data = model.toJSON(),
            changed = model.changedAttributes();

        socket.emit('jolira-sync', {
            url:url,
            data:data,
            changed:changed
        }, function (err, data) {
            if (err) {
                return options.error(model, err);
            }

            return options.success(data);
        });

        return undefined;
    };
})(io, $, _, Backbone, Lawnchair, window.location, window["jolira-app"]);
