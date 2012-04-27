/*!
 * @depends ../core/AudioletNode.js
 */

/**
 * Divide values
 *
 * **Inputs**
 *
 * - Audio 1
 * - Audio 2
 *
 * **Outputs**
 *
 * - Divided audio
 *
 * **Parameters**
 *
 * - value The value to divide by.  Linked to input 1.
 *
 * @constructor
 * @extends AudioletNode
 * @param {Audiolet} audiolet The audiolet object.
 * @param {Number} [value=1] The initial value to divide by.
 */
var Divide = function(audiolet, value) {
    AudioletNode.call(this, audiolet, 2, 1);
    this.linkNumberOfOutputChannels(0, 0);
    this.value = new AudioletParameter(this, 1, value || 1);
};
extend(Divide, AudioletNode);

/**
 * Process samples
 */
Divide.prototype.generate = function() {
    var input = this.inputs[0];
    var output = this.outputs[0];

    var value = this.value.getValue();

    var numberOfChannels = input.samples.length;
    for (var i = 0; i < numberOfChannels; i++) {
        output.samples[i] = input.samples[i] / value;
    }
};

/**
 * toString
 *
 * @return {String} String representation.
 */
Divide.prototype.toString = function() {
    return 'Divide';
};

