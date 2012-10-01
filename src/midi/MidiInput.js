/**
 * Class representing a midi input of a MidiGroup
 *
 * @constructor
 * @param {AudioletNode} node The node which the input belongs to.
 * @param {Number} index The index of the input.
 */
var MidiInput = function(node, index) {
    AudioletInput.apply(this, arguments);
};
extend(MidiInput, AudioletInput);