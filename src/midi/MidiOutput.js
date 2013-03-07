/*!
 * @depends ../core/AudioletOutput.js
 */

/**
 * Class representing a midi output of a MidiGroup
 */
var MidiOutput = AudioletOutput.extend({

    /*
     * Constructor
     *
     * @param {AudioletNode} node The node which the input belongs to.
     * @param {Number} index The index of the input.
     */
    constructor: function(node, index) {
        AudioletOutput.apply(this, arguments);
    },

    connect: function(input) {
        var midiInput;
        for (var i = 0; i < input.inputs.length; i++) {
            if (input.inputs[i] instanceof MidiInput) {
                midiInput = input.inputs[i];
            }
        };
        this.connectedTo = midiInput;
    },

    send: function(channel, key, vel) {
        this.connectedTo.node.midi(channel, key, vel);
    }

});