var Destination = require('./destination');

/**
 * The base context object.  Contains an output node which pulls data from
 * connected nodes.
 *
 * @constructor
 * @param {Number} [numberOfChannels=2] The number of output channels.
 * @param {Number} [bufferSize] Block size.  If undefined uses a sane default.
 */
var Audiolet = function(numberOfChannels, bufferSize) {
    this.output = new Destination(this, numberOfChannels, bufferSize);
};

module.exports = Audiolet;
