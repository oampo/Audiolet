/*!
 * @depends ../core/PassThroughNode.js
 */

/**
 * Detect potentially hazardous values in the audio stream.  Looks for
 * undefineds, nulls, NaNs and Infinities.
 *
 * **Inputs**
 *
 * - Audio
 *
 * **Outputs**
 *
 * - Audio
 */
var BadValueDetector = PassThroughNode.extend({

    /**
     * Constructor
     *
     * @extends PassThroughNode
     * @param {Audiolet} audiolet The audiolet object.
     * @param {Function} [callback] Function called if a bad value is detected.
     */
    constructor: function(audiolet, callback) {
        PassThroughNode.call(this, audiolet, 1, 1);
        this.linkNumberOfOutputChannels(0, 0);

        if (callback) {
            this.callback = callback;
        }
    },

    /**
     * Default callback.  Logs the value and position of the bad value.
     *
     * @param {Number|Object|'undefined'} value The value detected.
     * @param {Number} channel The index of the channel the value was found in.
     * @param {Number} index The sample index the value was found at.
     */
    callback: function(value, channel) {
        console.error(value + ' detected at channel ' + channel);
    },

    /**
     * Process samples
     */
    generate: function() {
        var input = this.inputs[0];

        var numberOfChannels = input.samples.length;
        for (var i = 0; i < numberOfChannels; i++) {
            var value = input.samples[i];
            if (typeof value == 'undefined' ||
                value == null ||
                isNaN(value) ||
                value == Infinity ||
                value == -Infinity) {
                this.callback(value, i);
            }
        }
    },

    /**
     * toString
     *
     * @return {String} String representation.
     */
    toString: function() {
        return 'Bad Value Detector';
    }

});