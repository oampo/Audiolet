/*!
 * @depends ../core/AudioletNode.js
 */

/**
 * Simple trigger which allows you to set a single sample to be 1 and then
 * resets itself.
 *
 * **Outputs**
 *
 * - Triggers
 *
 * **Parameters**
 *
 * - trigger Set to 1 to fire a trigger.
 */
var TriggerControl = AudioletNode.extend({

    parameters: {
        trigger: [null, 0]
    },

    /**
     * Constructor
     *
     * @extends AudioletNode
     * @param {Audiolet} audiolet The audiolet object.
     * @param {Number} [trigger=0] The initial trigger state.
     */
    constructor: function(audiolet, trigger) {
        AudioletNode.call(this, audiolet, 0, 1, {
            trigger: trigger
        });
    },

    /**
     * Process samples
     */
    generate: function() {
        if (this.trigger.getValue() > 0) {
            this.outputs[0].samples[0] = 1;
            this.trigger.setValue(0);
        }
        else {
            this.outputs[0].samples[0] = 0;
        }
    },

    /**
     * toString
     *
     * @return {String} String representation.
     */
    toString: function() {
        return 'Trigger Control';
    }

});