/*!
 * @depends AudioletNode.js
 */

/**
 * Audio output device.  Uses sink.js to output to a range of APIs.
 *
 * @constructor
 * @param {Audiolet} audiolet The audiolet object.
 * @param {Number} [sampleRate=44100] The sample rate to run at.
 * @param {Number} [numberOfChannels=2] The number of output channels.
 * @param {Number} [bufferSize=8192] A fixed buffer size to use.
 */
function AudioletDevice(audiolet, sampleRate, numberOfChannels, bufferSize) {
    AudioletNode.call(this, audiolet, 1, 0);

    this.sink = Sink(this.tick.bind(this), numberOfChannels, bufferSize,
                     sampleRate);

    // Re-read the actual values from the sink.  Sample rate especially is
    // liable to change depending on what the soundcard allows.
    this.sampleRate = this.sink.sampleRate;
    this.numberOfChannels = this.sink.channelCount;
    this.bufferSize = this.sink.preBufferSize;

    this.writePosition = 0;
    this.buffer = null;
}
extend(AudioletDevice, AudioletNode);

/**
* Overridden tick function. Pulls data from the input and writes it to the
* device.
*
* @param {Float32Array} buffer Buffer to write data to.
* @param {Number} numberOfChannels Number of channels in the buffer.
*/
AudioletDevice.prototype.tick = function(buffer, numberOfChannels) {
    var samplesNeeded = buffer.length / numberOfChannels;
    AudioletNode.prototype.tick.call(this, samplesNeeded, this.writePosition);
    var interleaved = this.buffer.interleaved();
    var numberOfSamples = interleaved.length;
    for (var i = 0; i < numberOfSamples; i++) {
        buffer[i] = interleaved[i];
    }
    this.writePosition += samplesNeeded;
};

/**
* Make the input buffer available as a member.
*
* @param {AudioletBuffer[]} inputBuffers An array containing the input buffer.
* @param {AudioletBuffer[]} outputBuffers An empty array.
*/
AudioletDevice.prototype.generate = function(inputBuffers, outputBuffers) {
    this.buffer = inputBuffers[0];
};

/**
 * Get the current output position
 *
 * @return {Number} Output position in samples.
 */
AudioletDevice.prototype.getPlaybackTime = function() {
    return this.sink.getPlaybackTime();
};

/**
 * Get the current write position
 *
 * @return {Number} Write position in samples.
 */
AudioletDevice.prototype.getWriteTime = function() {
    return this.writePosition;
};

/**
 * toString
 *
 * @return {String} String representation.
 */
AudioletDevice.prototype.toString = function() {
    return 'Audio Output Device';
};
