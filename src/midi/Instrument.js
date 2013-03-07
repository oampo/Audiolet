/*!
 * @depends MidiGroup.js
 */

/**
 * An Instrument is a MidiGroup which controls a set of generators (voices)
 * based on noteOn and noteOff messages.
 */
var Instrument = MidiGroup.extend({

  /*
   * Constructor
   *
   * @param {Audiolet} audiolet The audiolet object.
   */
    constructor: function(audiolet) {
        MidiGroup.call(this, audiolet, 1, 1, 0, null);
        this.createVoice = function(frequency) { return new Sine(audiolet, frequency); };
        this._voices = {};
    },

    // this maps midi key values to `voice` objects
    // for instance, midi key `71` maps to { key: 'C', octave: 4 }
    scale: (function() {

      var midi_to_key = {},
          scale = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#',
              'G', 'G#', 'A', 'A#', 'B'];

      var msg = 0;
      for (var octave = -2, msg = 0; octave <= 8; octave++) {
          for (var i = 0; i < scale.length; i++, msg++) {
              midi_to_key[msg] = { key: scale[i], octave: octave };
          };
      };

      return midi_to_key;

    })(),

    noteOn: function(key, vel) {
        console.log('got note on', this.scale[key].key, this.scale[key].octave);
        var frequency = (key * 8),
            voice = new this.createVoice(frequency);
        voice.connect(this.outputs[0]);
        this._voices[key] = voice;
    },

    noteOff: function(key, vel) {
        this._voices[key].remove();
    }

});