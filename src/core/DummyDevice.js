/**
 * @depends AbstractAudioletDevice.js
 */

var DummyDevice = function(audiolet, sampleRate, numberOfChannels, bufferSize) {
    AbstractAudioletDevice.call(this, audiolet);

    this.sampleRate = sampleRate || 44100.0;
    this.numberOfChannels = numberOfChannels || 2;
    this.bufferSize = bufferSize || 8192;

    this.writePosition = 0;

    setInterval(this.tick.bind(this), 1000 * this.bufferSize / this.sampleRate);
}
extend(DummyDevice, AbstractAudioletDevice);

DummyDevice.prototype.tick = function() {
    AudioletNode.prototype.tick.call(this, this.bufferSize, this.writePosition);
    this.writePosition += this.bufferSize;
}

DummyDevice.prototype.getPlaybackTime = function() {
    return this.writePosition - this.bufferSize;
}

DummyDevice.prototype.getWriteTime = function() {
    return this.writePosition;
}

DummyDevice.prototype.toString = function() {
    return 'Dummy Device';
}
