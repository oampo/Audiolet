/*!
 * @depends ../core/AudioletInput.js
 */

/**
 * Class representing a midi input of a MidiGroup
 */
var MidiInput = AudioletInput.extend({

    /*
     * Constructor
     *
     * @param {AudioletNode} node The node which the input belongs to.
     * @param {Number} index The index of the input.
     */
    constructor: function(node, index) {
        AudioletInput.apply(this, arguments);
    }

});