/*jslint node: true, vars: true, indent: 4 */
(function (module) {
    "use strict";

    var SECRET = 'R4@DtoelECf0',
        CIPHER = 'aes-256-cbc',
        crypto = require('crypto'),
        cipher = crypto.createCipher(CIPHER, SECRET),
        decipher = crypto.createDecipher(CIPHER, SECRET);

    function encrypt(message) {
        var crypted = cipher.update(message, 'utf8', 'hex');

        return crypted + cipher.final('hex');
    }

    function descrypt(crypted) {
        var message = decipher.update(crypted, 'hex', 'utf8');

        return message + decipher.final('utf8');
    }
})(module);