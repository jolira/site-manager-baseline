/*global PhoneGap:false, require:false */
(function ($, _, Backbone, app) {
    "use strict";

    var cache = {};

    _.extend(app, Backbone.Events);

    app.initializers = [];
    app.getTemplate = function (id) {
        if (cache[id]) {
            return cache[id];
        }

        var script = $(id),
            html = script.html();

        if (!html) {
            throw Error("no html fragment found for " + id);
        }

        return cache[id] = _.template(html);
    };

    $(function(){
        var Router = Backbone.Router.extend({}),
            initializers = app.initializers;

        delete app.initializers;

        app.router = new Router();

        var route = app.router.route;

        app.router.route = function (_route, name, cb) {
            return route.call(app.router, _route, name, function () {
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

    // UUID Generator from http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript
    function S4() {
        return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
    }

    app.uuid = function() {
        return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
    }
})($, _, Backbone, window["jolira-app"]);