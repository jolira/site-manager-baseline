(function (localStorage, app) {
    "use strict";

    app.store = function(dbname, cb) {
        return cb({
            get: function(key, cb) {
                return cb(localStorage.getItem(dbname + "::" + key));
            },
            save: function(key, value, cb) {
                localStorage.setItem(dbname + "::" + key, value)

                return cb && cb();
            }
        });
    } || {};
})(window.localStorage, window["jolira-app"]);
