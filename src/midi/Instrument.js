var Instrument = function(audiolet) {
    MidiGroup.call(this, audiolet, 1, 1, 0, null);
    this.createVoice = function(frequency) { return new Sine(audiolet, frequency); };
    this._voices = {};
};
extend(Instrument, MidiGroup);

// this maps midi key values to `voice` objects
// for instance, midi key `71` maps to { key: 'C', octave: 4 }
Instrument.prototype.scale = (function() {

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

})();

Instrument.prototype.noteOn = function(key, vel) {
    console.log('got note on', this.scale[key].key, this.scale[key].octave);
    var frequency = (key * 8),
        voice = new this.createVoice(frequency);
    voice.connect(this.outputs[0]);
    this._voices[key] = voice;
};

Instrument.prototype.noteOff = function(key, vel) {
    this._voices[key].remove();
};