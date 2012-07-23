/*global PhoneGap:false, require:false */
(function ($, _, Backbone, app) {
    "use strict";

    var cache = {};

    app.backbone = app.backbone || {};

    _.extend(app.backbone, Backbone.Events);

    function createRouter() {
        var Router = Backbone.Router.extend({});

        return new Router();
    }

    app.starter.on("initialized", function() {
        return Backbone.history.start();
    });

    app.starter.$(function(next, initializers){
        var router = app.backbone.router || createRouter();

        app.backbone.route = app.backbone.route || function (route, name, cb) {
            return router.route(route, name, function () {
                app.log("route", route, name, Array.prototype.slice.call(arguments));

                return cb.apply(this, arguments);
            });
        };
        app.backbone.navigate = app.backbone.navigate || function (fragment, options) {
            return router.navigate(fragment, options);
        };

        return next();
    });
})($, _, Backbone, window["jolira-app"]);