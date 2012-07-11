(function ($, _, Backbone, app) {
    "use strict";

    app.initializers.push(function (next) {
        /**
         * Allow users to add their own routable views. When creating view
         * the options are passed to the constructor, which contain the
         * arguments object passed to the callback function.
         *
         * @param route the route (passed to backbone.js)
         * @param name the name of the route
         * @param View the view to be rendered
         */
        app.addRoutableView = function(route, name, View){
            app.router.route(route, name, function() {
                var args = arguments,
                    $children = $('body > *');

                if (app.currentView && app.currentView.close) {
                    app.currentView.close();
                }

                $children.each(function(idx, child) {
                    var $child = $(child),
                        name = $child.prop("tagName");

                    if ('HEADER' !== name && 'FOOTER' !== name && 'SCRIPT' !== name) {
                        $child.remove();
                    }
                });

                app.currentView = new View({
                    arguments: args
                });

                var rendered = app.currentView.render();

                $('body > header').after(rendered.el);
            });
        };

        return next();
        // app.router.navigate("order/0", {trigger:true});
    });
})($, _, Backbone, window["jolira-app"]);
