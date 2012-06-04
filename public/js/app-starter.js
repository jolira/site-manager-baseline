/*global PhoneGap:false, require:false */
(function ($, _, Backbone) {
    "use strict";

    var cache = {},
        app = window["jolira-app"] = {
            getTemplate:function (id) {
                if (cache[id]) {
                    return cache[id];
                }

                var script = $(id),
                    html = script.html();

                if (!html) {
                    throw Error("no html fragment found for " + id);
                }

                return cache[id] = _.template(html);
            },
            /**
             * Add your callback to this array
             */
            initializers: []
        };

    $(function(){
        var Router = Backbone.Router.extend({});

        app.router = new Router();
        app.initializers.forEach(function(initializer) {
            initializer(app, "#main-content");
        });

        delete app.initializers;
        Backbone.history.start();
    });
})($, _, Backbone);