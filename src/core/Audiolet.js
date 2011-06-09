/**
 * The base audiolet object.  Contains an output node which pulls data from
 * connected nodes.
 */
var Audiolet = new Class({
    initialize: function(sampleRate, numberOfChannels, bufferSize) {
        this.output = new AudioletDestination(this, sampleRate,
                                              numberOfChannels, bufferSize);
    }
});

