var Scale = require('./scale');

/**
 * Major scale.
 *
 * @constructor
 * @extends Scale
 */
var Major = function() {
    Scale.call(this, [0, 2, 4, 5, 7, 9, 11]);
};
Major.prototype = Object.create(Scale.prototype);
Major.prototype.constructor = Scale;

module.exports = Major;
