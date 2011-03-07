/**
 * @depends ../core/AudioletNode.js
 */

// Maths from http://www.musicdsp.org/files/Audio-EQ-Cookbook.txt
var BiquadFilter = new Class({
    Extends: AudioletNode,
    initialize: function(audiolet, frequency) {
        AudioletNode.prototype.initialize.apply(this, [audiolet, 2, 1]);

        // Same number of output channels as input channels
        this.linkNumberOfOutputChannels(0, 0);

        this.frequency = new AudioletParameter(this, 1, frequency || 22100);
        this.lastFrequency = null; // See if we need to recalculate coefficients

        // Delayed values
        this.xValues = [];
        this.yValues = [];

        // Coefficients
        this.b0 = 0;
        this.b1 = 0;
        this.b2 = 0;
        this.a0 = 0;
        this.a1 = 0;
        this.a2 = 0;
    },

    // Overwrite me
    calculateCoefficients: function(frequency) {
    },

    generate: function(inputBuffers, outputBuffers) {
        var inputBuffer = inputBuffers[0];
        var outputBuffer = outputBuffers[0];

        if (inputBuffer.isEmpty) {
            outputBuffer.isEmpty = true;
            return;
        }

        var inputChannels = [];
        var outputChannels = [];
        var numberOfChannels = inputBuffer.numberOfChannels;
        for (var i = 0; i < numberOfChannels; i++) {
            inputChannels.push(inputBuffer.getChannelData(i));
            outputChannels.push(outputBuffer.getChannelData(i));
            if (i >= this.xValues.length) {
                this.xValues.push([0, 0]);
                this.yValues.push([0, 0]);
            }
        }

        // Local processing variables
        var frequencyParameter = this.frequency;
        var frequency, frequencyChannel;
        if (frequencyParameter.isStatic()) {
            frequency = frequencyParameter.getValue();
        }
        else {
            frequencyChannel = frequencyParameter.getChannel();
        }
            
            
        var lastFrequency = this.lastFrequency;

        var a0 = this.a0;
        var a1 = this.a1;
        var a2 = this.a2;
        var b0 = this.b0;
        var b1 = this.b1;
        var b2 = this.b2;

        var bufferLength = outputBuffer.length;
        for (var i = 0; i < bufferLength; i++) {
            if (frequencyChannel) {
                var frequency = frequencyChannel[i];
            }

            if (frequency != lastFrequency) {
                // Recalculate and make the coefficients local
                this.calculateCoefficients(frequency);
                lastFrequency = frequency;
                a0 = this.a0;
                a1 = this.a1;
                a2 = this.a2;
                b0 = this.b0;
                b1 = this.b1;
                b2 = this.b2;
            }

            for (var j = 0; j < numberOfChannels; j++) {
                var inputChannel = inputChannels[j];
                var outputChannel = outputChannels[j];

                var xValues = this.xValues[j];
                var x1 = xValues[0];
                var x2 = xValues[1];
                var yValues = this.yValues[j];
                var y1 = yValues[0];
                var y2 = yValues[1];

                var x0 = inputChannel[i];
                var y0 = (b0 / a0) * x0 +
                         (b1 / a0) * x1 +
                         (b2 / a0) * x2 -
                         (a1 / a0) * y1 -
                         (a2 / a0) * y2;

                outputChannel[i] = y0;


                xValues[0] = x0;
                xValues[1] = x1;
                yValues[0] = y0;
                yValues[1] = y1;
            }
        }
        this.lastFrequency = lastFrequency;
    },

    toString: function() {
        return 'Biquad Filter';
    }
});
