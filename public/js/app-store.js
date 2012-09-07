(function (localStorage, app) {
    "use strict";

    function parse(value) {
        try {
            return JSON.parse(value);
        }
        catch(e) {
            app.log("app-store parse", value, e);
            return undefined;
        }
    }

    function stringify(value) {
        try {
            return JSON.stringify(value);
        }
        catch(e) {
            app.log("app-store stringify", value, err);
            return undefined;
        }
    }

    app.store = app.store || function(dbname, cb) {
        return cb({
            get: function(key, cb) {
                var value = localStorage.getItem(dbname + "::" + key);

                return cb(parse(value));
            },
            save: function(key, value, cb) {
                localStorage.setItem(dbname + "::" + key, stringify(value))

                return cb && cb();
            },
            remove: function(key, cb) {
                localStorage.removeItem(dbname + "::" + key)

                return cb && cb();
            }
        });
    };
    app.store.reset = function() {
        localStorage.clear()
    };

})(window.localStorage, window["jolira-app"]);
