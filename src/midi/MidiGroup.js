/**
 * A MidiGroup is almost identical to an AudioletGroup, except it
 * let's you define which input and output index represent MidiInputs
 * and MidIOutputs. It additionally provides a `midi` method which
 * maps midi messages to instance methods. `.midi(144, 44, 255)` for instance,
 * will trigger .noteOn(44, 255);.
 *
 * The MidiInput, MidiOutput, and MidiGroup nodes all behave the same as Audiolet
 * objects for routing purposes- but `MidiOutput` has a unique method; `send`.
 * `send` will send a midi message to the node that output is connected to. 
 *
 * @constructor
 * @param {Audiolet} audiolet The audiolet object.
 * @param {Number} numberOfInputs The number of inputs.
 * @param {Number} numberOfOutputs The number of outputs.
 * @param {Number} midiIn The input index to use for midi in.
 * @param {Number} midiOut The output index to use for midi out.
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