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

    function ready(socket, id) {
        app.socket.emit("device", "synchronize", id);
        app.trigger("device-ready", id)
    }

    app.initializers.push(function(next) {
        new Lawnchair(function(store) {
            var url = getServerURL();

            app.store = store;
            app.socket = io.connect(url);
            app.socket.on('ready', function (props) {
                store.get("device", function(device) {
                    if (device) {
                        return ready(device.id);
                    }

                    return store.save({
                        key: "device",
                        id: props.session
                    }, function(device) {
                        return ready(device.id);
                    });
                });
            });
            return next();
        });
    });
})(io, $, _, Backbone, Lawnchair, window.location, window["jolira-app"]);
