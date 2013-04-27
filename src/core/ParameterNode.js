/*!
 * @depends ../core/AudioletNode.js
 */

/**
 * A type of AudioletNode designed to allow AudioletGroups to exactly replicate
 * the behaviour of AudioletParameters.  By linking one of the group's inputs
 * to the ParameterNode's input, and calling `this.parameterName =
 * parameterNode` in the group's constructor, `this.parameterName` will behave
 * as if it were an AudioletParameter contained within an AudioletNode.
 *
 * **Inputs**
 *
 * - Parameter input
 *
 * **Outputs**
 *
 * - Parameter value
 *
 * **Parameters**
 *
 * - parameter The contained parameter.  Linked to input 0.
 */
var ParameterNode = AudioletNode.extend({

    defaults: {
        parameter: [0, null]
    },

    /**
     * Constructor
     *
     * @extends AudioletNode
     * @param {Audiolet} audiolet The audiolet object.
     * @param {Number} value The initial static value of the parameter.
     */
    constructor: function(audiolet, value) {
        AudioletNode.call(this, audiolet, 1, 1, {
            value: value
        });
    },

    /**
     * Process samples
     */
    generate: function() {
        this.outputs[0].samples[0] = this.get('parameter');
    },

    /**
     * toString
     *
     * @return {String} String representation.
     */
    toString:function() {
        return 'Parameter Node';
    }

});