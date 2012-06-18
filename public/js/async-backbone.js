(function (io, $, _, Backbone, Lawnchair, location, app) {
    "use strict";

    function init(socket, id) {
        return app.socket.emit("device", "synchronize", id);
    }

    new Lawnchair({name:'tailoring'}, function(store) {
        app.store = store;
        app.socket = io.connect(location.origin); // TODO, {secure: true});
        app.socket.on('init', function (props) {
            store.get("device", function(device) {
                if (device) {
                    return init(device.id);
                }

                return store.save({
                    key: "device",
                    id: props.session
                }, function(device) {
                    return init(device.id);
                });
            });
        });
    });
})(io, $, _, Backbone, Lawnchair, window.location, window["jolira-app"]);
