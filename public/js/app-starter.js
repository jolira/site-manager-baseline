/*global PhoneGap:false, require:false */
(function ($, _, Backbone, app) {
    "use strict";

    /**
     * Create a starter object, which governs the execution of the initialization scripts.
     *
     */
    app.starter = app.starter || {};

    _.extend(app.starter, Backbone.Events);

    var initializers = [];

    app.starter.$ = function(){
        if (!initializers) {
            throw new Error("initialization already started");
        }

        var args = Array.prototype.slice.call(arguments);

        args.forEach(function(init) {
            initializers.push(init);
        });
    };

    function incrementalInit(inits) {
        var init = inits && inits.shift();

        if (!init) {
            return app.starter.trigger("initialized");
        }

        return init(function (updatedInits) {
            return incrementalInit(updatedInits || inits);
        }, inits);
    }

    $(function () {
        var inits = initializers;

        initializers = undefined;

        incrementalInit(inits);
    });
})($, _, Backbone, window["jolira-app"]);