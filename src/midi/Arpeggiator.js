/*!
 * @depends MidiGroup.js
 */

 /**
 * An Arpeggiator is a MidiGroup which modifies the MIDI messages on
 * input 0, and forwards the newly generated messages on output 0.
 */
var Arpeggiator = MidiGroup.extend({

    /*
     * Constructor
     * @param {Audiolet} audiolet The audiolet object.
     */
    constructor: function(audiolet) {
        MidiGroup.call(this, audiolet, 1, 1, 0, 0);
        this.key_cancel_map = {};
    },

    noteOn: function(key, vel) {

        var self = this,
            midiOut = this.outputs[0],
            startKey = key,
            scheduler = this.audiolet.scheduler,
            phase = 0,
            down = false;

        // start note
        midiOut.send(144, key, vel);

        // cycle stops previous note and starts new note
        var e = scheduler.play(
            new PSequence([1, 0], Infinity),
            1/4,
            function() {
                midiOut.send(128, key, vel);
                key = down? key - 3: key + 3;
                phase = down? phase - 1: phase + 1,
                down = down? phase != -3: phase == 3;
                midiOut.send(144, key, vel);
            });

        self.key_cancel_map[startKey] = function() {
            scheduler.stop(e);
            midiOut.send(128, key, vel);
        };

    },

    noteOff: function(key, vel) {
        this.key_cancel_map[key]();
    }

});