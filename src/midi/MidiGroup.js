/**
 * A container for collections of connected AudioletNodes.  Groups make it
 * possible to create multiple copies of predefined networks of nodes,
 * without having to manually create and connect up each individual node.
 *
 * From the outside groups look and behave exactly the same as nodes.
 * Internally you can connect nodes directly to the group's inputs and
 * outputs, allowing connection to nodes outside of the group.
 *
 * @constructor
 * @param {Audiolet} audiolet The audiolet object.
 * @param {Number} numberOfInputs The number of inputs.
 * @param {Number} numberOfOutputs The number of outputs.
 */
var MidiGroup = function(audiolet, numberOfInputs, numberOfOutputs, midiIn, midiOut) {
    this.audiolet = audiolet;

    this.inputs = [];
    for (var i = 0; i < numberOfInputs; i++) {
        if (i == midiIn) {
            this.inputs.push(new MidiInput(this, 1, 1));
        } else {
            this.inputs.push(new PassThroughNode(this.audiolet, 1, 1));
        }
    }

    this.outputs = [];
    for (var i = 0; i < numberOfOutputs; i++) {
        if (i == midiOut) {
            this.outputs.push(new MidiOutput(this, 1, 1));
         } else {
            this.outputs.push(new PassThroughNode(this.audiolet, 1, 1));
        }
    }
};
extend(MidiGroup, AudioletGroup);

MidiGroup.prototype.channels = {
    144: 'noteOn',
    128: 'noteOff'
};

MidiGroup.prototype.midi = function(channel, key, vel) {
    var method = this[this.channels[channel]].bind(this);
    method(key, vel);
};

MidiGroup.prototype.noteOn = function(key, vel) {
    this.outputs[0].send(144, key, vel);
};

MidiGroup.prototype.noteOff = function(key, vel) {
    this.outputs[0].send(128, key, vel);
};