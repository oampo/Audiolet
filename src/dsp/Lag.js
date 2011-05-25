/**
 * @depends ../core/AudioletNode.js
 */

var Lag = new Class({
    Extends: AudioletNode,
    initialize: function(audiolet, value, lagTime) {
        AudioletNode.prototype.initialize.apply(this, [audiolet, 2, 1]);
        this.value = new AudioletParameter(this, 0, value || 0);
        this.lag = new AudioletParameter(this, 1, lagTime || 1);
        this.lastValue = value || 0;

        this.log001 = Math.log(0.001);
    },

    generate: function(inputBuffers, outputBuffers) {
        var outputBuffer = outputBuffers[0];
        var outputChannel = outputBuffer.getChannelData(0);

        var sampleRate = this.audiolet.device.sampleRate;
        var log001 = this.log001;

        var valueParameter = this.value;
        var value, valueChannel;
        if (valueParameter.isStatic()) {
            value = valueParameter.getValue();
        }
        else {
            valueChannel = valueParameter.getChannel();
        }

        var lagParameter = this.lag;
        var lag, lagChannel, coefficient;
        if (lagParameter.isStatic()) {
            lag = lagParameter.getValue();
            coefficient = Math.exp(log001 / (lag * sampleRate));
        }
        else {
            lagChannel = lagParameter.getChannel();
        }

        var lastValue = this.lastValue;

        var bufferLength = outputBuffer.length;
        for (var i = 0; i < bufferLength; i++) {
            if (valueChannel) {
                value = valueChannel[i];
                coefficient = Math.exp(log001 / (lag * sampleRate))
            }

            if (lagChannel) {
                lag = lagChannel[i];
            }
            var output = ((1 - coefficient) * value) +
                          (coefficient * lastValue);
            outputChannel[i] = output;
            lastValue = output;
        }
        this.lastValue = lastValue;
    },

    toString: function() {
        return 'Lag';
    }
});

