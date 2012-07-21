/*global PhoneGap:false, require:false */
(function ($, _, Backbone, app) {
    "use strict";

    var cache = {};

    app.starter = app.starter || {};
    app.starter.initializers = app.starter.initializers || [];

    $(function(){
        var Router = Backbone.Router.extend({}),
            initializers = app.starter.initializers;

        delete app.starter.initializers;

        app.starter.router = new Router();

        var route = app.starter.router.route;

        app.starter.router.route = function (_route, name, cb) {
            return route.call(app.starter.router, _route, name, function () {
                app.log("route", _route, name, Array.prototype.slice.call(arguments));
                return cb.apply(this, arguments);
            });
        };

        function init() {
            var initializer = initializers.shift();

            if (!initializer) {
                return Backbone.history.start();
            }

            return initializer(init);
        }

        init();
    });
})($, _, Backbone, window["jolira-app"]);