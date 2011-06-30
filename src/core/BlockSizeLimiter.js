/*!
 * @depends AudioletNode.js
 */

/**
 * Node to limit the size of sample blocks which are processed.  Any larger
 * blocks requested are split into smaller blocks and recombined at the end
 * of a tick call.
 *
 * **Inputs**
 *
 * - Audio
 *
 * **Outputs**
 *
 * - Audio
 *
 * @constructor
 * @extends AudioletNode
 * @param {Audiolet} audiolet The audiolet object.
 * @param {Number} maximumBlockSize The largest allowed block size.
 */
var BlockSizeLimiter = function(audiolet, maximumBlockSize) {
    AudioletNode.call(this, audiolet, 1, 1);
    this.maximumBlockSize = maximumBlockSize;
    this.linkNumberOfOutputChannels(0, 0);
};
extend(BlockSizeLimiter, AudioletNode);

/**
 * Overridden tick method.  Splits any calls with length larger than the
 * maximum block size into chunks smaller than the maximum, combining the
 * chunks in the output buffers.
 *
 * @param {Number} length The number of samples to process.
 * @param {Number} timestamp A timestamp for the block of samples.
 */
BlockSizeLimiter.prototype.tick = function(length, timestamp) {
    var maximumBlockSize = this.maximumBlockSize;
    if (length < maximumBlockSize) {
        // Enough samples from the last tick and buffered, so just tick
        // and recalculate any overflow
        AudioletNode.prototype.tick.call(this, length, timestamp);
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
};

/**
 * Overridden function reading from the input buffers, and putting new values
 * into sections of the output buffers.
 *
 * @param {AudioletBuffer[]} inputBuffers Samples received from the inputs.
 * @param {AudioletBuffer[]} outputBuffers Samples to be sent to the outputs.
 * @param {Number} offset Sample offset for writing to the output buffers.
 */
BlockSizeLimiter.prototype.generate = function(inputBuffers, outputBuffers,
                                               offset) {
    offset = offset || 0;
    var inputBuffer = inputBuffers[0];
    var outputBuffer = outputBuffers[0];
    if (inputBuffer.isEmpty) {
        outputBuffer.isEmpty = true;
        return;
    }
    outputBuffer.setSection(inputBuffer, inputBuffer.length,
                            0, offset);
};

/**
 * toString
 *
 * @return {String} String representation.
 */
BlockSizeLimiter.prototype.toString = function() {
    return 'Block Size Limiter';
};
