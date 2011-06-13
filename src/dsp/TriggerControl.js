/**
 * @depends ../core/AudioletNode.js
 */

var TriggerControl = function(audiolet, trigger) {
    AudioletNode.call(this, audiolet, 0, 1);
    this.trigger = new AudioletParameter(this, null, trigger || 0);
};
extend(TriggerControl, AudioletNode);

TriggerControl.prototype.generate = function(inputBuffers, outputBuffers) {
    var buffer = outputBuffers[0];
    var channel = buffer.getChannelData(0);

    var triggerParameter = this.trigger;
    var trigger = triggerParameter.getValue();

    var bufferLength = buffer.length;
    for (var i = 0; i < bufferLength; i++) {
        if (trigger) {
            channel[i] = 1;
            triggerParameter.setValue(0);
            trigger = 0;
        }
        else {
            channel[i] = 0;
        }
    }
};

TriggerControl.prototype.toString = function() {
    return 'Trigger Control';
};
