/*jslint node: true, vars: true, indent: 4 */
(function (module) {
    "use strict";

    function convert(id, session, _args) {
        var args = Array.prototype.slice.call(_args, 2),
            params = [
                _args[0],
                _args[1],
                id,
                session
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
                var client = this,
                    args = arguments;

                return client.get("id", function (err, id) {
                    var params = convert(client.id, id, args),
                        level = params[0],
                        _logger = logger[level] || logger.info;

                    return _logger.apply(_logger, params);
                });
            }
        }
    };
})(module);