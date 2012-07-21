/*jslint node: true, vars: true, indent: 4 */
(function (__dirname, module) {
    "use strict";

    var fs = require('fs'),
        path = require("path"),
        socket = require("socket.io"),
        hbars = require("handlebars"),
        uuid = require("node-uuid");

    function locate(dirs, file, cb, idx) {
        var i = idx || 0;

        if (i >= dirs.length) {
            return cb(new Error("file " + file + " not find in " + dirs));
        }

        var qfile = path.join(dirs[i], file);

        return path.exists(qfile, function (exists) {
            if (exists) {
                return cb(undefined, qfile);
            }

            return locate(dirs, file, cb, i + 1);
        });
    }

    function listen(server, logger, secure, listeners) {
        var active = false,
            io = socket.listen(server, {
                logger:logger,
                secure:secure
            });

        io.sockets.on('connection', function (client) {
            active = true;
            var events = Object.keys(listeners);

            events.forEach(function (topic) {
                var all = listeners[topic];

                all.forEach(function (listener) {
                    client.on(topic, function() {
                        listener.apply(client, arguments);
                    });
                });
            });

            client.on("log", function() {
                logger.info.apply(null, Array.prototype.slice.call(arguments));
            });
            client.on("error", function() {
                logger.error.apply(null, Array.prototype.slice.call(arguments));
            });

            var sessionId = uuid.v1();

            client.emit('ready', { session:sessionId });
        });

        return io;
    }

    function getRequestHandler(defaults, secure, app, cb) {
        return function (req, res, next) {
            if (!req.url.match(req.url.match(/js\/async-backbone\.js$/))) {
                return next();
            }

            return locate(defaults["public"], "js/middleware.js", function (err, manifestFile) {
                if (err) {
                    return cb(err);
                }

                return fs.readFile(manifestFile, "utf-8", function (err, content) {
                    if (err) {
                        throw err;
                    }

                    var template = hbars.compile(content);
                    var body = template({
                            secure:secure,
                            port:secure ? app.sslPort : app.listenPort
                        }),
                        ccontrol = app.logger.isDebugging ? 'NO-CACHE' : 'public, max-age=' + (defaults.maxAge / 1000),
                        headers = {
                            'Content-Type':'application/javascript; charset=UTF-8',
                            'Content-Length':body.length,
                            'Cache-Control':ccontrol
                        };

                    res.writeHead(200, headers);
                    return res.end(body);
                });
            });
        };
    }

    module.exports = function (defaults, app, cb) {
        var listeners = {},
            active = false,
            io = listen(app.httpServer, app.logger, false, listeners),
            secure = !!app.httpsServer;

        if (secure) {
            io = listen(app.httpsServer, app.logger, true, listeners);
        }

        app.use(getRequestHandler(defaults, secure, app));

        return cb(undefined, {
            secure:secure,
            on:function (topic, listener) {
                if (active) {
                    throw new Error("clients already active");
                }

                var all = listeners[topic] = listeners[topic] || [];

                all.push(listener);
            }
        });
    };
})(__dirname, module);