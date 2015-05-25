var Node = require('../core/node');
var Parameter = require('../core/parameter');

/**
 * Equal-power cross-fade between two signals
 *
 * **Inputs**
 *
 * - Audio 1
 * - Audio 2
 * - Fade Position
 *
 * **Outputs**
 *
 * - Mixed audio
 *
 * **Parameters**
 *
 * - position The fade position.  Values between 0 (Audio 1 only) and 1 (Audio
 * 2 only).  Linked to input 2.
 *
 * @constructor
 * @extends Node
 * @param {Audiolet} context The context object.
 * @param {Number} [position=0.5] The initial fade position.
 */
var CrossFade = function(context, position) {
    Node.call(this, context, 3, 1);
    this.linkNumberOfOutputChannels(0, 0);
    this.position = new Parameter(this, 2, position || 0.5);
};
CrossFade.prototype = Object.create(Node.prototype);
CrossFade.prototype.constructor = CrossFade;

/**
 * Process samples
 */
CrossFade.prototype.generate = function() {
    var inputA = this.inputs[0];
    var inputB = this.inputs[1];
    var output = this.outputs[0];

    // Local processing variables
    var position = this.position.getValue();

    var scaledPosition = position * Math.PI / 2;
    var gainA = Math.cos(scaledPosition);
    var gainB = Math.sin(scaledPosition);

    var numberOfChannels = output.samples.length;
    for (var i = 0; i < numberOfChannels; i++) {
        var valueA = inputA.samples[i] || 0;
        var valueB = inputB.samples[i] || 0;
        output.samples[i] = valueA * gainA + valueB * gainB;
    }
};

/**
 * toString
 *
 * @return {String} String representation.
 */
CrossFade.prototype.toString = function() {
    return 'Cross Fader';
};

module.exports = CrossFade;
