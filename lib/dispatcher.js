/*jslint node: true, vars: true, indent: 4 */
(function (__dirname, module) {
    "use strict";

    var RedisStore = require('socket.io/lib/stores/redis'),
        fs = require('fs'),
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

        io.configure('production', function () {
            io.enable('browser client etag');          // apply etag caching logic based on version number
            io.enable('browser client gzip');          // gzip the file
            io.enable('browser client minification');  // send minified client
            io.set('log level', 0);
            io.set('transports', [                     // enable all transports (optional if you want flashsocket)
                'websocket',
                'flashsocket',
                'htmlfile',
                'xhr-polling',
                'jsonp-polling'
            ]);
        });
        io.configure('development', function () {
            io.set('log level', 0);
            io.set('transports', [                     // enable all transports (optional if you want flashsocket)
                'websocket'
            ]);
        });
        io.configure(function () {
            if (hidden.redis) {
                var store = new RedisStore();

                store.on('error', hidden.logger.error);
                io.set('store', store);
            }
        });
        io.sockets.on('connection', function (client) {
            hidden.active = true;
            var topics = Object.keys(hidden.listeners);

            topics.forEach(function (topic) {
                var registered = hidden.listeners[topic];

                registered.forEach(function (listener) {
                    if (topic === 'connection') {
                        return listener.apply(client);
                    }

                    return client.on(topic, function () {
                        listener.apply(client, arguments);
                    });
                });
            });
        });
    }

    function getRequestHandler(hidden, defaults, cb) {
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
                            secure:hidden.secure,
                            port:hidden.secure ? hidden.sslPort : hidden.listenPort
                        }),
                        ctl = hidden.logger.isDebugging ? 'NO-CACHE' : 'public, max-age=' + (defaults.maxAge / 1000),
                        headers = {
                            'Content-Type':'application/javascript; charset=UTF-8',
                            'Content-Length':body.length,
                            'Cache-Control':ctl
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

        topics.forEach(function (topic) {
            var listener = mod[topic];

            registerListener(listeners, topic, listener);
        });
    }

    module.exports = function (defaults, app, lopts, gopts, cb) {
        var hidden = {
                redis:lopts.redis || gopts.redis,
                secure: lopts.secure || gopts.secure || !!app.httpsServer,
                listenPort: lopts.advertizedListenPort || gopts.advertizedListenPort || app.listenPort,
                sslPort: lopts.advertizedSslPort || gopts.advertizedSslPort ||app.sslPort,
                logger:app.logger,
                listeners:{},
                active:false
            },
            requestHandler = getRequestHandler(hidden, defaults);

        listen(app.httpServer, app.logger, false, hidden);

        if (hidden.secure) {
            listen(app.httpsServer, app.logger, true, hidden);
        }

        app.use(requestHandler);

        return cb(undefined, {
            secure:hidden.secure,
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