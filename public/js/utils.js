/*global PhoneGap:false, require:false */
(function ($, _, Backbone, app) {
    "use strict";

    var cache = {};

    app.utils = app.utils || {};

    // UUID Generator from http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript
    function S4() {
        return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
    }

    /**
     * Create a UUID.
     *
     * @type {*}
     */
    app.utils.uuid = app.utils.uuid || function() {
        return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
    }

    /**
     * Load html from a script.
     *
     * @type {*}
     */
    app.utils.template = app.utils.template || function (id) {
        if (cache[id]) {
            return cache[id];
        }

        var script = $(id),
            html = script.html();

        if (!html) {
            return app.error("html fragment not found",  id);
        }

        return cache[id] = _.template(html);
    };

})($, _, Backbone, window["jolira-app"]);