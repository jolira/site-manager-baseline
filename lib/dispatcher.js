/*jslint node: true, vars: true, indent: 4 */
(function (module) {
    "use strict";

    var path = require("path"),
        socket = require("socket.io"),
        pubdir = path.join(__dirname, "public"),
        uuid = require("node-uuid");

    function listen(server, logger, secure, listeners) {
        var io = socket.listen(server, {
                logger:logger,
                secure:secure
            }),
            listeners = {},
            active = false;

        io.sockets.on('connection', function (client) {
            active = true;
            var events = Object.keys(listeners);

            events.forEach(function (topic) {
                var all = listeners[topic];

                all.forEach(function (listener) {
                    client.on(topic, listener);
                });
            });

            var sessionId = uuid.v1();

            client.emit('init', { session:sessionId });
        });

        return io;
    }

    module.exports = function (app, cb) {
        var listeners = {},
            active = false,
            io = listen(app.httpServer, app.logger, false, listeners);

        if (app.httpsServer) {
            io = listen(app.httpsServer, app.logger, true, listeners);
        }

        return cb(undefined, {
            on:function (topic, listener) {
                if (active) {
                    throw new Error("clients already active");
                }

                var all = listeners[topic] = listeners[topic] || [];

                all.push(listener);
            }
        });
    };
})(module);