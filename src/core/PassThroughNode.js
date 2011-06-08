/**
 * @depends AudioletNode.js
 */

var PassThroughNode = function(audiolet, numberOfInputs, numberOfOutputs) {
  PassThroughNode.superclass.call(this, audiolet, numberOfInputs, numberOfOutputs);
}
extend(PassThroughNode, AudioletNode);

PassThroughNode.prototype.createOutputBuffers = function(length) {
  var outputBuffers = [];
  var numberOfOutputs = this.numberOfOutputs;
  var numberOfInputs = this.numberOfInputs;
  // Copy the inputs buffers straight to the output buffers
  for (var i = 0; i < numberOfOutputs; i++) {
    var output = this.outputs[i];
    if (i < numberOfInputs) {
      // Copy the input buffer straight to the output buffers
      var input = this.inputs[i];
      output.buffer = input.buffer;
    }
    else {
      output.buffer.resize(output.getNumberOfChannels(), length);
    }
    outputBuffers.push(output.buffer);
  }
  return (outputBuffers);
}

PassThroughNode.prototype.toString = function() {
  return 'Pass Through Node';
}
