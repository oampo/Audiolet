/**
 * @depends Envelope.js
 */
var ADSREnvelope = function(audiolet, gate, attack, decay, sustain, release,
    onComplete) {
  var levels = [0, 1, sustain, 0];
  var times = [attack, decay, release];
  ADSREnvelope.superclass.call(this, audiolet, gate, levels, times, 2, onComplete);
}
extend(ADSREnvelope, Envelope);

ADSREnvelope.prototype.toString = function() {
  return 'ADSR Envelope';
}
