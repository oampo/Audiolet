/*!
 * @depends ../core/AudioletNode.js
 */

/*
 * Multiply and add values
 *
 * **Inputs**
 *
 * - Audio
 * - Multiply audio
 * - Add audio
 *
 * **Outputs**
 *
 * - MulAdded audio
 *
 * **Parameters**
 *
 * - mul The value to multiply by.  Linked to input 1.
 * - add The value to add.  Linked to input 2.
 *
 * @constructor
 * @extends AudioletNode
 * @param {Audiolet} audiolet The audiolet object.
 * @param {Number} [mul=1] The initial value to multiply by.
 * @param {Number} [add=0] The initial value to add.
 */
var MulAdd = function(audiolet, mul, add) {
    AudioletNode.call(this, audiolet, 3, 1);
    this.linkNumberOfOutputChannels(0, 0);
    this.mul = new AudioletParameter(this, 1, mul || 1);
    this.add = new AudioletParameter(this, 2, add || 0);
};
extend(MulAdd, AudioletNode);

/**
 * Process samples
 */
MulAdd.prototype.generate = function() {
    var input = this.inputs[0];
    var output = this.outputs[0];

    var mul = this.mul.getValue();
    var add = this.add.getValue();

    var numberOfChannels = input.samples.length;
    for (var i = 0; i < numberOfChannels; i++) {
        output.samples[i] = input.samples[i] * mul + add;
    }
};

/**
 * toString
 *
 * @return {String} String representation.
 */
MulAdd.prototype.toString = function() {
    return 'Multiplier/Adder';
};

