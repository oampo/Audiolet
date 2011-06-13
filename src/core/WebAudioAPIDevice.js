/**
 * @depends AbstractAudioletDevice.js
 */

var WebAudioAPIDevice = function(audiolet, sampleRate, numberOfChannels, bufferSize) {
    // Call Super class contructor
    AbstractAudioletDevice.call(this, audiolet);

    this.numberOfChannels = numberOfChannels || 2;
    this.bufferSize = bufferSize || 8192;

    // AudioContext is called webkitAudioContext in the current
    // implementation, so look for either
    if (typeof AudioContext != 'undefined') {
        this.context = new AudioContext();
    }
    else {
        // Must be webkitAudioContext
        this.context = new webkitAudioContext();
    }

    // Ignore specified sample rate, and use whatever the context gives us
    this.sampleRate = this.context.sampleRate;

    this.node = this.context.createJavaScriptNode(this.bufferSize, 1,
                                                  1);

    this.node.onaudioprocess = this.tick.bind(this);
    this.node.connect(this.context.destination);
    this.writePosition = 0;
}
extend(WebAudioAPIDevice, AbstractAudioletDevice);

WebAudioAPIDevice.prototype.tick = function(event) {
    var buffer = event.outputBuffer;
    var samplesNeeded = buffer.length;
    AudioletNode.prototype.tick.call(this, samplesNeeded, 
                                     this.getWriteTime());
    var numberOfChannels = buffer.numberOfChannels;
    for (var i = 0; i < numberOfChannels; i++) {
        var channel = buffer.getChannelData(i);
        channel.set(this.buffer.getChannelData(i));
    }
    this.writePosition += samplesNeeded;
}

WebAudioAPIDevice.prototype.getPlaybackTime = function() {
    return this.context.currentTime * this.sampleRate;
}

WebAudioAPIDevice.prototype.getWriteTime = function() {
    return this.writePosition;
}

WebAudioAPIDevice.prototype.toString = function() {
    return 'Web Audio API Device';
}
