/**
 * @depends Envelope.js
 */
var PercussiveEnvelope = function(audiolet, gate, attack, release, onComplete) {
    var levels = [0, 1, 0];
    var times = [attack, release];
    Envelope.call(this, audiolet, gate, levels, times, null, onComplete); 
}
extend(PercussiveEnvelope, Envelope);

PercussiveEnvelope.prototype.toString = function() {
    return 'Percussive Envelope';
}
