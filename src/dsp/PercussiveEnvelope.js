/**
 * @depends Envelope.js
 */
var PercussiveEnvelope = new Class({
    Extends: Envelope,
    initialize: function(audiolet, gate, attack, release, onComplete) {
        var levels = [0, 1, 0];
        var times = [attack, release];
        Envelope.prototype.initialize.apply(this, [audiolet, gate, levels,
                                                   times, null,  onComplete]);
    },

    toString: function() {
        return "Percussive Envelope";
    }
});

