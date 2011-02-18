var Envelope = new Class({
    Extends: AudioletNode,
    initialize: function(audiolet, gate, numberOfInputs, onComplete) {
        AudioletNode.prototype.initialize.apply(this, [audiolet, 1,
                                                       numberOfInputs]);
        this.gate = new AudioletParameter(this, 0, gate || 1);
        this.onComplete = onComplete;
    }
});
