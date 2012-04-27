/**
 * @depends ../core/AudioletNode.js
 */

/**
 * Hyperbolic tangent of values.  Works nicely as a distortion function.
 *
 * **Inputs**
 *
 * - Audio
 *
 * **Outputs**
 *
 * - Tanh audio
 *
 * @constructor
 * @extends AudioletNode
 * @param {Audiolet} audiolet The audiolet object.
 */

var Tanh = function(audiolet) {
    AudioletNode.call(this, audiolet, 1, 1);
    this.linkNumberOfOutputChannels(0, 0);
};
extend(Tanh, AudioletNode);

/**
 * Process samples
 */
Tanh.prototype.generate = function() {
    var input = this.inputs[0];
    var output = this.outputs[0];

    var numberOfChannels = input.samples.length;
    for (var i = 0; i < numberOfChannels; i++) {
        var value = input.samples[i];
        output.samples[i] = (Math.exp(value) - Math.exp(-value)) /
                            (Math.exp(value) + Math.exp(-value));
    } 
};

/**
 * toString
 *
 * @return {String} String representation.
 */
Tanh.prototype.toString = function() {
    return ('Tanh');
};

