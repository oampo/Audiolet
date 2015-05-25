/**
 * Class representing a single output of an Node
 *
 * @constructor
 * @param {Node} node The node which the input belongs to.
 * @param {Number} index The index of the input.
 */
var Output = function(node, index) {
    this.node = node;
    this.index = index;
    this.connectedTo = [];
    this.samples = [];

    this.linkedInput = null;
    this.numberOfChannels = 1;
};

/**
 * Connect the output to an input
 *
 * @param {Input} input The input to connect to.
 */
Output.prototype.connect = function(input) {
    this.connectedTo.push(input);
};

/**
 * Disconnect the output from an input
 *
 * @param {Input} input The input to disconnect from.
 */
Output.prototype.disconnect = function(input) {
    var numberOfStreams = this.connectedTo.length;
    for (var i = 0; i < numberOfStreams; i++) {
        if (input == this.connectedTo[i]) {
            this.connectedTo.splice(i, 1);
            break;
        }
    }
};

/**
 * Link the output to an input, forcing the output to always contain the
 * same number of channels as the input.
 *
 * @param {Input} input The input to link to.
 */
Output.prototype.linkNumberOfChannels = function(input) {
    this.linkedInput = input;
};

/**
 * Unlink the output from its linked input
 */
Output.prototype.unlinkNumberOfChannels = function() {
    this.linkedInput = null;
};

/**
 * Get the number of output channels, taking the value from the input if the
 * output is linked.
 *
 * @return {Number} The number of output channels.
 */
Output.prototype.getNumberOfChannels = function() {
    if (this.linkedInput && this.linkedInput.connectedFrom.length) {
        return (this.linkedInput.samples.length);
    }
    return (this.numberOfChannels);
};

/**
 * toString
 *
 * @return {String} String representation.
 */
Output.prototype.toString = function() {
    return this.node.toString() + 'Output #' + this.index + ' - ';
};

module.exports = Output;
