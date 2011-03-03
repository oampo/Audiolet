/**
 * @depends AudioletNode.js
 */

var BlockSizeLimiter = new Class({
    Extends: AudioletNode,
    initialize: function(audiolet, maximumBlockSize) {
        AudioletNode.prototype.initialize.apply(this, [audiolet, 1, 1]);
        this.maximumBlockSize = maximumBlockSize;
        this.linkNumberOfOutputChannels(0, 0);
    },


    tick: function(length, timestamp) {
        var maximumBlockSize = this.maximumBlockSize;
        if (length < maximumBlockSize) {
            // Enough samples from the last tick and buffered, so just tick
            // and recalculate any overflow
            AudioletNode.prototype.tick.apply(this, [length, timestamp]);
        }
        else {
            // Not enough samples available, so we will have to do it in blocks
            // of size maximumBlockSize
            var samplesGenerated = 0;
            var outputBuffers = null;
            while (samplesGenerated < length) {
                var samplesNeeded;
                // If length does not split exactly into the block size,
                // then do the small block size first, so at the end we still
                // have a lastTickSize equal to maximumBlockSize
                var smallBlockSize = length % maximumBlockSize;
                if (samplesGenerated == 0 && smallBlockSize) {
                    samplesNeeded = smallBlockSize;
                }
                else {
                    samplesNeeded = maximumBlockSize;
                }

                this.tickParents(samplesNeeded, timestamp + samplesGenerated);

                var inputBuffers = this.createInputBuffers(samplesNeeded);
                if (!outputBuffers) {
                    outputBuffers = this.createOutputBuffers(length);
                }
                this.generate(inputBuffers, outputBuffers, samplesGenerated);

                samplesGenerated += samplesNeeded;
            }
        }
    },

    generate: function(inputBuffers, outputBuffers, offset) {
        offset = offset || 0;
        var inputBuffer = inputBuffers[0];
        var outputBuffer = outputBuffers[0];
        if (inputBuffer.isEmpty) {
            outputBuffer.isEmpty = true;
            return;
        }
        outputBuffer.setSection(inputBuffer, inputBuffer.length,
                                0, offset);
    },

    toString: function() {
        return 'Block Size Limiter';
    }
});
