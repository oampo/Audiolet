/*!
 * @depends Envelope.js
 */

/**
 * Linear attack-decay-sustain-release envelope
 *
 * **Inputs**
 *
 * - Gate
 *
 * **Outputs**
 *
 * - Envelope
 *
 * **Parameters**
 *
 * - gate The gate turning the envelope on and off.  Value changes from 0 -> 1
 * trigger the envelope.  Value changes from 1 -> 0 make the envelope move to
 * its release stage.  Linked to input 0.
 *
 * @extends Envelope
 */
var ADSREnvelope = new Class({
    Extends: Envelope,
    /**
     * Constructor
     *
     * @param {Audiolet} audiolet The audiolet object
     * @param {Number} gate The initial gate value
     * @param {Number} attack The attack time in seconds
     * @param {Number} decay The decay time in seconds
     * @param {Number} sustain The sustain level (between 0 and 1)
     * @param {Number} release The release time in seconds
     * @param {Function} onComplete A function called after the release stage
     */
    initialize: function(audiolet, gate, attack, decay, sustain, release,
                         onComplete) {
        var levels = [0, 1, sustain, 0];
        var times = [attack, decay, release];
        Envelope.prototype.initialize.apply(this, [audiolet, gate, levels,
                                                   times, 2, onComplete]);
    },

    /**
     * toString
     *
     * @return {String}
     */
    toString: function() {
        return 'ADSR Envelope';
    }
});

