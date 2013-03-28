/*!
 * @depends MidiGroup.js
 */

/**
 * A MidiKeyboard simply broadcasts MIDI messages on a single MIDI output,
 * based on events fired from keyboard input.
 */
var MidiKeyboard = MidiGroup.extend({

    /*
     * Constructor
     *
     * @param {Audiolet} audiolet The audiolet object.
     */
    constructor: function(audiolet) {
        MidiGroup.call(this, audiolet, 0, 1, null, 0);
        this._pressed = {};
        document.addEventListener('keydown', this.tryNoteOn.bind(this));
        document.addEventListener('keyup', this.tryNoteOff.bind(this));
    },

    // this maps e.which values to midi note values.
    // for instance, 'G' on the keyboard is `70`,
    // which maps to midi key `71`, or, middle C
    scale: {
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
    },

    tryNoteOn: function(e) {
        var eventKey = e.which,
            midiKey = this.scale[eventKey];
        if (!this._pressed[eventKey] && midiKey) {
            this._pressed[eventKey] = true;
            this.outputs[0].send(144, midiKey, 255);
        }
    },

    tryNoteOff: function(e) {
        var eventKey = e.which,
            midiKey = this.scale[eventKey];
        if (this._pressed[eventKey] && midiKey) {
            this._pressed[eventKey] = false;
            this.outputs[0].send(128, midiKey, 255);
        }
    }

});