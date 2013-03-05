/*!
 * @depends AudioletClass.js
 */

/**
 * Class representing a single output of an AudioletNode
 */
var AudioletOutput = AudioletClass.extend({

    /**
     * Constructor
     *
     * @param {AudioletNode} node The node which the input belongs to.
     * @param {Number} index The index of the input.
     */
    constructor: function(node, index) {
        AudioletClass.call(this);
        this.node = node;
        this.index = index;
        this.connectedTo = [];
        this.samples = [];

        this.linkedInput = null;
        this.numberOfChannels = 1;
    },

    /**
     * Connect the output to an input
     *
     * @param {AudioletInput} input The input to connect to.
     */
    connect: function(input) {
        this.connectedTo.push(input);
    },

    /**
     * Disconnect the output from an input
     *
     * @param {AudioletInput} input The input to disconnect from.
     */
    disconnect: function(input) {
        var numberOfStreams = this.connectedTo.length;
        for (var i = 0; i < numberOfStreams; i++) {
            if (input == this.connectedTo[i]) {
                this.connectedTo.splice(i, 1);
                break;
            }
        }
    },

    /**
     * Link the output to an input, forcing the output to always contain the
     * same number of channels as the input.
     *
     * @param {AudioletInput} input The input to link to.
     */
    linkNumberOfChannels: function(input) {
        this.linkedInput = input;
    },

    /**
     * Unlink the output from its linked input
     */
    unlinkNumberOfChannels: function() {
        this.linkedInput = null;
    },

    /**
     * Get the number of output channels, taking the value from the input if the
     * output is linked.
     *
     * @return {Number} The number of output channels.
     */
    getNumberOfChannels: function() {
        if (this.linkedInput && this.linkedInput.connectedFrom.length) {
            return (this.linkedInput.samples.length);
        }
        return (this.numberOfChannels);
    },

    /**
     * toString
     *
     * @return {String} String representation.
     */
    toString: function() {
        return this.node.toString() + 'Output #' + this.index + ' - ';
    }

});