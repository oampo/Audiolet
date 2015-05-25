var Node = require('../core/node');

/**
 * A white noise source
 *
 * **Outputs**
 *
 * - White noise
 *
 * @constructor
 * @extends Node
 * @param {Audiolet} context The context object.
 */
var WhiteNoise = function(context) {
    Node.call(this, context, 0, 1);
};
WhiteNoise.prototype = Object.create(Node.prototype);
WhiteNoise.prototype.constructor = WhiteNoise;

/**
 * Process samples
 */
WhiteNoise.prototype.generate = function() {
    this.outputs[0].samples[0] = Math.random() * 2 - 1;
};

/**
 * toString
 *
 * @return {String} String representation.
 */
WhiteNoise.prototype.toString = function() {
    return 'White Noise';
};

module.exports = WhiteNoise;
