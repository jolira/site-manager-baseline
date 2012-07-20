(function ($, _, Backbone, app) {
    "use strict";

    var selector = app.isQUnit ? "#qview" : "body",
        childSelector = selector + ' > *',
        headerSelector = selector + ' > header';

    app.initializers.push(function (next) {
        /**
         * Allow users to add their own routable views. When creating view
         * the options are passed to the constructor, which contain the
         * arguments object passed to the callback function.
         *
         * @param route the route (passed to backbone.js)
         * @param name the name of the route
         * @param creator the method to be called to create the view
         */
        app.addRoute = function(route, name, creator){
            app.router.route(route, name, function() {
                var $children = $(childSelector),
                    args = Array.prototype.slice.call(arguments);

                if (app.currentView) {
                    if (app.currentView.close) {
                        app.currentView.close();
                    }

                    delete app.currentView;
                }

                $children.each(function(idx, child) {
                    var $child = $(child),
                        name = $child.prop("tagName");

                    if ('HEADER' !== name && 'FOOTER' !== name && 'SCRIPT' !== name) {
                        $child.remove();
                    }
                });

                args.push(function(err, view) {
                    if (err) {
                        return app.error(err);
                    }

                    var rendered = view.render();

                    app.currentView = view;

                    $(headerSelector).after(rendered.el);

                });

                creator.apply(this, args);

                return false;
            });
        };

        return next();
        // app.router.navigate("order/0", {trigger:true});
    });
})($, _, Backbone, window["jolira-app"]);
