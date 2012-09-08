/**
 * Class representing a single input of an AudioletNode
 *
 * @constructor
 * @param {AudioletNode} node The node which the input belongs to.
 * @param {Number} index The index of the input.
 */
var MidiInput = function(node, index) {
    AudioletInput.apply(this, arguments);
};
extend(MidiInput, AudioletInput);