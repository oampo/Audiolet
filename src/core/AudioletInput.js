/**
 * Class representing a single input of an AudioletNode
 *
 * @constructor
 * @param {AudioletNode} node The node which the input belongs to.
 * @param {Number} index The index of the input.
 */
var AudioletInput = function(node, index) {
    this.node = node;
    this.index = index;
    this.connectedFrom = [];
    // Minimum sized buffer, which we can resize from accordingly
    this.samples = [];
};

/**
 * Connect the input to an output
 *
 * @param {AudioletOutput} output The output to connect to.
 */
AudioletInput.prototype.connect = function(output) {
    this.connectedFrom.push(output);
};

/**
 * Disconnect the input from an output
 *
 * @param {AudioletOutput} output The output to disconnect from.
 */
AudioletInput.prototype.disconnect = function(output) {
    var numberOfStreams = this.connectedFrom.length;
    for (var i = 0; i < numberOfStreams; i++) {
        if (output == this.connectedFrom[i]) {
            this.connectedFrom.splice(i, 1);
            break;
        }
    }
    if (this.connectedFrom.length == 0) {
        this.samples = [];
    }
};

/**
 * toString
 *
 * @return {String} String representation.
 */
AudioletInput.prototype.toString = function() {
    return this.node.toString() + 'Input #' + this.index;
};

