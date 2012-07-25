(function ($, _, Backbone, app) {
    "use strict";

    var Placeholder = Backbone.View.extend({
        el: "#sm-container"
    });

    app.container = app.container || {};
    app.starter.$(function (next) {
        var current = new Placeholder();

        /**
         * Allow users to add their own routable views. When creating view
         * the options are passed to the constructor, which contain the
         * arguments object passed to the callback function.
         *
         * @param route the route (passed to backbone.js)
         * @param name the name of the route
         * @param creator the method to be called to create the view
         * @param router this parameter allows us to override the router function
         *        to be called. If this method is not passed, app.router.route
         *        is called.
         */
        app.container.route = function (route, name, creator, router) {
            router = router || app.backbone.route;

            router(route, name, function () {
                var childSelector = app.container.anchor + ' > *[data-sm-container-managed]',
                    headerSelector = app.container.anchor + ' > header',
                    $children = $(childSelector),
                    args = Array.prototype.slice.call(arguments);

                if (current.close) {
                    current.close();
                }

                args.push(function (err, view) {
                    if (err) {
                        return app.error(err);
                    }

                    var existing = current,
                        rendered = view.render();

                    current = view;

                    existing.$el.replaceWith(rendered.el);

                });

                creator.apply(this, args);

                return false;
            });
        };

        return next();
    });
})($, _, Backbone, window["jolira-app"]);
