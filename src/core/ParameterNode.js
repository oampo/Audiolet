/**
 * @depends ../core/AudioletNode.js
 */

var ParameterNode = function(audiolet, value) {
  ParameterNode.superclass.call(this, audiolet, 1, 1);
  this.parameter = new AudioletParameter(this, 0, value);
}
extend(ParameterNode, AudioletNode);

ParameterNode.prototype.generate = function(inputBuffers, outputBuffers) {
  var outputBuffer = outputBuffers[0];
  var outputChannel = outputBuffer.channels[0];

  // Local processing variables
  var parameterParameter = this.parameter;
  var parameter, parameterChannel;
  if (parameterParameter.isStatic()) {
    parameter = parameterParameter.getValue();
  }
  else {
    parameterChannel = parameterParameter.getChannel();
  }


  var bufferLength = outputBuffer.length;
  for (var i = 0; i < bufferLength; i++) {
    if (parameterChannel) {
      parameter = parameterChannel[i];
    }
    outputChannel[i] = parameter;
  }
}

ParameterNode.prototype.toString = function() {
  return 'Parameter Node';
}
