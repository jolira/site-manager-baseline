(function (io, $, _, Backbone, Lawnchair, location, app) {
    "use strict";

    var DEVICE = "device",
        READY = "ready",
        LOG = "log",
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

    function ready(id, session) {
        app.log = app.debug = function () {
            app.middle.socket.emit(LOG, id, session, new Date(), Array.prototype.slice.call(arguments));
        };
        app.error = function () {
            app.middle.socket.emit("error", id, session, new Date(), Array.prototype.slice.call(arguments));
        };
        // app.middle.socket.emit("device", "synchronize", id, session);
        app.middle.trigger(READY, id, session)
    }

    app.starter.initializers.push(function (next) {
        new Lawnchair(function (store) {
            var url = getServerURL();

            app.middle.store = store;
            app.middle.socket = io.connect(url);
            app.middle.socket.on(READY, function (props) {
                store.get(DEVICE, function (device) {
                    if (device) {
                        return ready(device.id, props.session);
                    }

                    return store.save({
                        key:DEVICE,
                        id:props.session
                    }, function (device) {
                        return ready(device.id, props.session);
                    });
                });
            });
            return next();
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
            url: url,
            data: data,
            changed: changed
        }, function (err, data) {
            if (err) {
                return options.error(model, err);
            }

            return options.success(data);
        });

        return undefined;
    };
})(io, $, _, Backbone, Lawnchair, window.location, window["jolira-app"]);
