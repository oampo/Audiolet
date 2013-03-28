/*!
 * @depends AudioletClass.js
 */

/**
 * The base audiolet object.  Contains an output node which pulls data from
 * connected nodes.
 */
var Audiolet = AudioletClass.extend({

    /**
     * Constructor
     *
     * @param {Number} [sampleRate=44100] The sample rate to run at.
     * @param {Number} [numberOfChannels=2] The number of output channels.
     * @param {Number} [bufferSize] Block size.  If undefined uses a sane default.
     */
    constructor: function(sampleRate, numberOfChannels, bufferSize) {
        AudioletClass.call(this);
        this.output = new AudioletDestination(this, sampleRate,
                                              numberOfChannels, bufferSize);
    }

});