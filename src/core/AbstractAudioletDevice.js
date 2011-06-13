/*!
 * @depends AudioletNode.js
 */

/**
 * An abstract base class for audio output devices
 *
 * @constructor
 * @extends AudioletNode
 * @param {Audiolet} audiolet The audiolet object.
 */
var AbstractAudioletDevice = function(audiolet) {
    AudioletNode.call(this, audiolet, 1 , 0);
    this.audiolet = audiolet;
    this.buffer = null;
};
extend(AbstractAudioletDevice, AudioletNode);

/**
 * Default generate function.  Makes the input buffer available as a
 * member.
 *
 * @param {AudioletBuffer[]} inputBuffers An array containing the input buffer.
 * @param {AudioletBuffer[]} outputBuffers An empty array.
 */
AbstractAudioletDevice.prototype.generate = function(inputBuffers,
                                                     outputBuffers) {
    this.buffer = inputBuffers[0];
};

/**
 * Default playback time function.
 *
 * @return {Number} Zero.
 */
AbstractAudioletDevice.prototype.getPlaybackTime = function() {
    return 0;
};

/**
 * Default write time function.
 *
 * @return {Number} Zero.
 */
AbstractAudioletDevice.prototype.getWriteTime = function() {
    return 0;
};

/**
 * toString
 *
 * @return {String} String representation.
 */
AbstractAudioletDevice.prototype.toString = function() {
    return 'Device';
};
