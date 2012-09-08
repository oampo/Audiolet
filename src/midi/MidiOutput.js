/**
 * Class representing a single output of an AudioletNode
 *
 * @constructor
 * @param {AudioletNode} node The node which the input belongs to.
 * @param {Number} index The index of the input.
 */
var MidiOutput = function(node, index) {
    AudioletOutput.apply(this, arguments);
};
extend(MidiOutput, AudioletOutput);

MidiOutput.prototype.connect = function(input) {
    var midiInput;
    for (var i = 0; i < input.inputs.length; i++) {
        if (input.inputs[i] instanceof MidiInput) {
            midiInput = input.inputs[i];
        }
    };
    this.connectedTo = midiInput;
};

MidiOutput.prototype.send = function(channel, key, vel) {
    this.connectedTo.node.midi(channel, key, vel);
};