/*jslint node: true, vars: true, indent: 4 */
(function (module) {
    "use strict";

    var path = require("path"),
        socket = require("socket.io"),
        pubdir = path.join(__dirname, "public"),
        uuid = require("node-uuid");

    module.exports = function (app, cb, logger) {
        var io = socket.listen(app, {
                logger:logger
            }),
            listeners = {},
            active = false;

        io.configure('development', function () {
            io.set('transports', ['websocket']);
        });
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