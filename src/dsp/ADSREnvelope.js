/**
 * @depends Envelope.js
 */
var ADSREnvelope = new Class({
    Extends: Envelope,
    initialize: function(audiolet, gate, attack, decay, sustain, release,
                         onComplete) {
        var levels = [0, 1, sustain, 0];
        var times = [attack, decay, release];
        Envelope.prototype.initialize.apply(this, [audiolet, gate, levels,
                                                   times, 2, onComplete]);
    },

    toString: function() {
        return 'ADSR Envelope';
    }
});

