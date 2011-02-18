/**
 * @depends Envelope.js
 */
var ADSR = new Class({
    Extends: Envelope,
    initialize: function(audiolet, gate, attack, decay, sustain, release,
                         onComplete) {
        Envelope.prototype.initialize.apply(this, [audiolet, gate, 5,
                                                   onComplete]);
        this.on = false;
        this.stage = null;
        this.level = 0;

        this.attack = new AudioletParameter(this, 1, attack || 0.01);
        this.decay = new AudioletParameter(this, 2, decay || 0.3);
        this.sustain = new AudioletParameter(this, 3, sustain || 0.5);
        this.release = new AudioletParameter(this, 4, release || 1);

        this.attackDelta = null;
        this.releaseDelta = null;
    },

    generate: function(inputBuffers, outputBuffers) {
        var buffer = outputBuffers[0];
        var channel = buffer.getChannelData(0);

        var sampleRate = this.audiolet.sampleRate;

        var gateParameter = this.gate;
        var attackParameter = this.attack;
        var decayParameter = this.decay;
        var sustainParameter = this.sustain;
        var releaseParameter = this.release;

        var on = this.on;
        var stage = this.stage;
        var level = this.level;
        var onComplete = this.onComplete;

        var attackDelta = this.attackDelta;
        var releaseDelta = this.releaseDelta;

        var bufferLength = buffer.length;
        for (var i=0; i<bufferLength; i++) {
            var gate = gateParameter.getValue(i);
            
            if (!on && gate) {
                on = true;
                stage = ADSR.ATTACK;
                var attack = attackParameter.getValue(i);
                attackDelta = (1 - level)/(attack * sampleRate);
            }

            if (on && !gate) {
                on = false;
                stage = ADSR.RELEASE;
                var release = releaseParameter.getValue(i);
                releaseDelta = level/(release * sampleRate);
            }

            if (stage == ADSR.ATTACK) {
                // Attack phase
                level += attackDelta;
                if (level >= 1) {
                    level = 1;
                    stage = ADSR.DECAY;
                    var decay = decayParameter.getValue(i);
                    var sustain = sustainParameter.getValue(i);
                    decayDelta = (1 - sustain)/(decay * sampleRate);
                }
            }
            else if (stage == ADSR.DECAY) {
                level -= decayDelta;
                var sustain = sustainParameter.getValue(i);
                if (level <= sustain) {
                    level = sustain;
                    stage = ADSR.SUSTAIN;
                }
            }
            else if (stage == ADSR.RELEASE) {
                level -= releaseDelta;
                if (level <= 0) {
                    level = 0;
                    stage = null;
                    if (onComplete) {
                        onComplete();
                    }
                }
            }

            channel[i] = level;
        }
        this.on = on;
        this.stage = stage;
        this.level = level;

        this.attackDelta = attackDelta;
        this.releaseDelta = releaseDelta;
    }
});

ADSR.ATTACK = 0;
ADSR.DECAY = 1;
ADSR.SUSTAIN = 2;
ADSR.RELEASE = 3;
