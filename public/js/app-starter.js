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