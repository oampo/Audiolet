var Scale = require('./scale');

/**
 * Minor scale.
 *
 * @constructor
 * @extends Scale
 */

var Minor = function() {
    Scale.call(this, [0, 2, 3, 5, 7, 8, 10]);
};
Minor.prototype = Object.create(Scale.prototype);
Minor.prototype.constructor = Scale;

module.exports = Minor;
