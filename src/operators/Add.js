/**
 * @depends ../core/AudioletNode.js
 */

var Add = function(audiolet, value) {
  Add.superclass.call(this, audiolet, 2, 1); 
  this.linkNumberOfOutputChannels(0, 0);
  this.value = new AudioletParameter(this, 1, value || 1);
}
extend(Add, AudioletNode);

Add.prototype.generate = function(inputBuffers, outputBuffers) {
  var inputBuffer = inputBuffers[0];
  var outputBuffer = outputBuffers[0];

  if (inputBuffer.isEmpty) {
    outputBuffer.isEmpty = true;
    return;
  }

  // Local processing variables
  var valueParameter = this.value;
  var value, valueChannel;
  if (valueParameter.isStatic()) {
    value = valueParameter.getValue();
  }
  else {
    valueChannel = valueParameter.getChannel();
  }

  var numberOfChannels = inputBuffer.numberOfChannels;
  for (var i = 0; i < numberOfChannels; i++) {
    var inputChannel = inputBuffer.getChannelData(i);
    var outputChannel = outputBuffer.getChannelData(i);
    var bufferLength = inputBuffer.length;
    for (var j = 0; j < bufferLength; j++) {
      if (valueChannel) {
        value = valueChannel[j];
      }
      outputChannel[j] = inputChannel[j] + value;
    }
  }
}

Add.prototype.toString = function() {
  return 'Add';
}

