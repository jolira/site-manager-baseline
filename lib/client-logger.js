/*jslint node: true, vars: true, indent: 4 */
(function (module) {
    "use strict";

    function convert(_args) {
        var args = Array.prototype.slice.call(_args, 4),
            params = [
                _args[0],
                _args[1],
                _args[2],
                _args[3]
            ];

        args.forEach(function (arg) {
            var param = JSON.parse(arg);

            params.push(param);
        });

        return params;
    }

    module.exports = function (logger) {
        return {
            'log':function () {
                var params = convert(arguments),
                    level = params[0],
                    _logger = logger[level] || logger.info;

                _logger.apply(_logger, params);
            }
        }
    };
})(module);