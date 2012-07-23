(function (io, $, _, Backbone, Lawnchair, location, app) {
    "use strict";

    var LOG = "log",
        DEVICE = "device",
        CONNECTED = "connected",
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
        app.middle.trigger(CONNECTED, app.middle.id, app.middle.session)
        app.log("ready", app.middle.id, app.middle.session);
    }

    function log(log, _args) {
        var args = Array.prototype.slice.call(_args),
            params = [
                log,
                app.middle.id,
                app.middle.session,
                new Date()
            ];


        app.middle.socket.emit(LOG, app.middle.id, app.middle.session, new Date(), Array.prototype.slice.call(arguments));
    }

    app.starter.$(function (next) {
        var url = getServerURL();

        app.middle.socket = io.connect(url);
        app.log = function () {
            app.middle.socket.emit(LOG, app.middle.id, app.middle.session, new Date(), Array.prototype.slice.call(arguments));
        };
        app.debug = function () {
            app.middle.socket.emit("debug", app.middle.id, app.middle.session, new Date(), Array.prototype.slice.call(arguments));
        };
        app.error = function () {
            app.middle.socket.emit("error", app.middle.id, app.middle.session, new Date(), Array.prototype.slice.call(arguments));
        };

        new Lawnchair(function (store) {
            app.middle.store = store;
            store.get(DEVICE, function (device) {
                app.middle.id = device && device.id;
                app.middle.socket.on(CONNECTED, function (props) {
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

        socket.emit('jolira-baseline-sync', {
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
