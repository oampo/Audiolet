/*!
 * @depends AudioletGroup.js
 */

/**
 * Group containing all of the components for the Audiolet output chain.  The
 * chain consists of:
 *
 *     Input => Scheduler => UpMixer => Output
 *
 * **Inputs**
 *
 * - Audio
 *
 * @constructor
 * @extends AudioletGroup
 * @param {Audiolet} audiolet The audiolet object.
 * @param {Number} [sampleRate=44100] The sample rate to run at.
 * @param {Number} [numberOfChannels=2] The number of output channels.
 * @param {Number} [bufferSize=8192] A fixed buffer size to use.
 */
var AudioletDestination = function(audiolet, sampleRate, numberOfChannels,
                                   bufferSize) {
    AudioletGroup.call(this, audiolet, 1, 0);

    this.device = new AudioletDevice(audiolet, sampleRate,
            numberOfChannels, bufferSize);
    audiolet.device = this.device; // Shortcut
    this.scheduler = new Scheduler(audiolet);
    audiolet.scheduler = this.scheduler; // Shortcut

    this.upMixer = new UpMixer(audiolet, this.device.numberOfChannels);

    this.inputs[0].connect(this.scheduler);
    this.scheduler.connect(this.upMixer);
    this.upMixer.connect(this.device);
};
extend(AudioletDestination, AudioletGroup);

/**
 * toString
 *
 * @return {String} String representation.
 */
AudioletDestination.prototype.toString = function() {
    return 'Destination';
};
