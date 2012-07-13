(function (io, $, _, Backbone, Lawnchair, location, app) {
    "use strict";

    var SECURE = "{{secure}}" == "true",
        PORT = "{{port}}";

    function getServerURL() {
        var protocol = SECURE ? "https://" : "http://",
            port = PORT || location.port;

        if (port) {
            port = ":" + port;
        }

        return protocol + location.hostname + port;
    }

    function ready(socket, id, session) {
        app.socket.emit("device", "synchronize", id, session);
        app.trigger("device-ready", id, session)
    }

    app.initializers.push(function (next) {
        new Lawnchair(function (store) {
            var url = getServerURL();

            app.store = store;
            app.socket = io.connect(url);
            app.socket.on('ready', function (props) {
                app.log = app.debug = function () {
                    app.socket.emit("log", props.session, new Date(), Array.prototype.slice.call(arguments));
                };
                app.error = function () {
                    app.socket.emit("error", props.session, new Date(), Array.prototype.slice.call(arguments));
                };
                store.get("device", function (device) {
                    if (device) {
                        return ready(device.id);
                    }

                    return store.save({
                        key:"device",
                        id:props.session
                    }, function (device) {
                        return ready(device.id);
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
