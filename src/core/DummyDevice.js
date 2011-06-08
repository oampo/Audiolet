/**
 * @depends AbstractAudioletDevice.js
 */

var DummyDevice = function(audiolet, sampleRate, numberOfChannels, bufferSize) {
  DummyDevice.superclass.call(this, audiolet);

  this.sampleRate = sampleRate || 44100.0;
  this.numberOfChannels = numberOfChannels || 2;
  this.bufferSize = bufferSize || 8192;

  this.writePosition = 0;

  this.tick.periodical(1000 * this.bufferSize / this.sampleRate, this);
}
extend(DummyDevice, AbstractAudioletDevice);

DummyDevice.prototype.tick = function() {
  DummyDevice.superproto.tick.call(this, this.bufferSize, this.writePosition);
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
