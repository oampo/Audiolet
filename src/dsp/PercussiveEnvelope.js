/*!
 * @depends Envelope.js
 */

/**
 * Simple attack-release envelope
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
 * - gate The gate controlling the envelope.  Value changes from 0 -> 1
 * trigger the envelope.  Linked to input 0.
 */
var PercussiveEnvelope = Envelope.extend({

    /**
     * Constructor
     *
     * @extends Envelope
     * @param {Audiolet} audiolet The audiolet object.
     * @param {Number} gate The initial gate value.
     * @param {Number} attack The attack time in seconds.
     * @param {Number} release The release time in seconds.
     * @param {Function} [onComplete] A function called after the release stage.
     */
    constructor: function(audiolet, gate, attack, release,
                                    onComplete) {
        var levels = [0, 1, 0];
        var times = [attack, release];
        Envelope.call(this, audiolet, gate, levels, times, null, onComplete);

        this.attack = this.times[0];
        this.release = this.times[1];
    },

    /**
     * toString
     *
     * @return {String} String representation.
     */
    toString: function() {
        return 'Percussive Envelope';
    }

});