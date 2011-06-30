/*!
 * @depends AbstractAudioletDevice.js
 */

/**
 * Dummy audio device which ticks inputs using setInterval.  Useful for testing
 * in environments where an audio API is unavailable.
 *
 * **Inputs**
 *
 * - Audio
 *
 * @constructor
 * @extends AbstractAudioletDevice
 * @param {Audiolet} audiolet The audiolet object.
 * @param {Number} [sampleRate=44100] The sample rate to run at.
 * @param {Number} [numberOfChannels=2] The number of output channels.
 * @param {Number} [bufferSize=8192] A fixed buffer size to use.
 */
var DummyDevice = function(audiolet, sampleRate, numberOfChannels,
                           bufferSize) {
    AbstractAudioletDevice.call(this, audiolet);

    this.sampleRate = sampleRate || 44100.0;
    this.numberOfChannels = numberOfChannels || 2;
    this.bufferSize = bufferSize || 8192;

    this.writePosition = 0;

    setInterval(this.tick.bind(this),
                1000 * this.bufferSize / this.sampleRate);
};
extend(DummyDevice, AbstractAudioletDevice);

/**
 * Overridden tick function.  Pulls data from the input.
 */
DummyDevice.prototype.tick = function() {
    AudioletNode.prototype.tick.call(this, this.bufferSize,
                                     this.writePosition);
    this.writePosition += this.bufferSize;
};

/**
 * Get the current output position
 *
 * @return {Number} Output position in samples.
 */
DummyDevice.prototype.getPlaybackTime = function() {
    return this.writePosition - this.bufferSize;
};

/**
 * Get the current write position
 *
 * @return {Number} Write position in samples.
 */
DummyDevice.prototype.getWriteTime = function() {
    return this.writePosition;
};

/**
 * toString
 *
 * @return {String} String representation.
 */
DummyDevice.prototype.toString = function() {
    return 'Dummy Device';
};
