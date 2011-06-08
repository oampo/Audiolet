/**
 * @depends ../core/AudioletNode.js
 */
var WhiteNoise = function(audiolet) {
  WhiteNoise.superclass.call(this, audiolet, 0, 1); 
}
extend(WhiteNoise, AudioletNode);

WhiteNoise.prototype.generate = function(inputBuffers, outputBuffers) {
  var buffer = outputBuffers[0];
  var channel = buffer.getChannelData(0);

  // Processing loop
  var bufferLength = buffer.length;
  for (var i = 0; i < bufferLength; i++) {
    channel[i] = Math.random() * 2 - 1;
  }
}

WhiteNoise.prototype.toString = function() {
  return 'White Noise';
}

