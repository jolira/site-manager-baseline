/*jslint node: true, vars: true, indent: 4 */
(function (__dirname, module) {
    "use strict";

    var fs = require('fs'),
        path = require("path"),
        socket = require("socket.io"),
        hbars = require("handlebars");

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

    function listen(server, logger, secure, hidden) {
        var io = socket.listen(server, {
                logger:logger,
                secure:secure
            });

        io.sockets.on('connection', function (client) {
            hidden.active = true;
            var topics = Object.keys(hidden.listeners);

            topics.forEach(function (topic) {
                var registered = hidden.listeners[topic];

                registered.forEach(function (listener) {
                    client.on(topic, function() {
                        listener.apply(client, arguments);
                    });
                });
            });
        });

        return io;
    }

    function getRequestHandler(defaults, secure, app, cb) {
        return function (req, res, next) {
            if (!req.url.match(req.url.match(/js\/app-middle\.js$/))) {
                return next();
            }

            return locate(defaults["public"], "js/app-middle.js", function (err, manifestFile) {
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

    function registerListener(listeners, topic, listener) {
        var registered = listeners[topic] = listeners[topic] || [];

        registered.push(listener);
    }

    function registerModule(listeners, mod) {
        var topics = Object.keys(mod);

        topics.forEach(function(topic) {
            var listener = mod[topic];

            registerListener(listeners, topic, listener);
        });
    }

    module.exports = function (defaults, app, cb) {
        var hidden = {
                listeners: {},
                active: false
            },
            io = listen(app.httpServer, app.logger, false, hidden),
            secure = !!app.httpsServer,
            requestHandler = getRequestHandler(defaults, secure, app);

        if (secure) {
            io = listen(app.httpsServer, app.logger, true, hidden);
        }

        app.use(requestHandler);

        return cb(undefined, {
            secure:secure,
            on:function () {
                if (hidden.active) {
                    throw new Error("clients already active");
                }

                if (arguments.length == 1) {
                    return registerModule(hidden.listeners, arguments[0]);
                }

                return registerListener(hidden.listeners, arguments[0], arguments[1]);
            }
        });
    };
})(__dirname, module);