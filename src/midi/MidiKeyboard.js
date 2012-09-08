var MidiKeyboard = function(audiolet) {
    MidiGroup.call(this, audiolet, 0, 1, null, 0);
    this._pressed = {};
    document.addEventListener('keydown', this.tryNoteOn.bind(this));
    document.addEventListener('keyup', this.tryNoteOff.bind(this));
};
extend(MidiKeyboard, MidiGroup);

// this maps e.which values to midi note values.
// for instance, 'G' on the keyboard is `70`,
// which maps to midi key `71`, or, middle C
MidiKeyboard.prototype.scale = {
    65: 64,
    87: 65,
    83: 67,
    69: 68,
    68: 69,
    82: 70,
    70: 71,
    71: 72,
    89: 73,
    72: 74,
    85: 75,
    74: 76,
    75: 78,
    79: 79,
    76: 80,
    80: 81
};

MidiKeyboard.prototype.tryNoteOn = function(e) {
    var eventKey = e.which,
        midiKey = this.scale[eventKey];
    if (!this._pressed[eventKey] && midiKey) {
        this._pressed[eventKey] = true;
        this.outputs[0].send(144, midiKey, 255);
    }
};

MidiKeyboard.prototype.tryNoteOff = function(e) {
    var eventKey = e.which,
        midiKey = this.scale[eventKey];
    if (this._pressed[eventKey] && midiKey) {
        this._pressed[eventKey] = false;
        this.outputs[0].send(128, midiKey, 255);
    }
};