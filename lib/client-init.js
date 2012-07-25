/*jslint node: true, vars: true, indent: 4 */
(function (module) {
    "use strict";

    module.exports = function(logger) {
        return {
            'middle-initialize':function (id) {
                this.set("id", id);
                logger.info("initialized", this.id, id);
            }
        };
    };
})(module);