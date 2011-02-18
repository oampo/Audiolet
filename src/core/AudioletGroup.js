var AudioletGroup = new Class({
    initialize: function(audiolet, numberOfInputs, numberOfOutputs) {
        this.audiolet = audiolet;
        this.numberOfInputs = numberOfInputs;
        this.numberOfOutputs = numberOfOutputs;

        this.inputs = [];
        for (var i=0; i<numberOfInputs; i++) {
            this.inputs.push(new PassThroughNode(this.audiolet, 1, 1));
        }
        
        this.outputs = [];
        for (var i=0; i<numberOfOutputs; i++) {
            this.outputs.push(new PassThroughNode(this.audiolet, 1, 1));
        }
    },

    connect: function(node, output, input) {
        this.outputs[output || 0].connect(node, 0, input);
    },

    disconnect: function(node, output, input) {
        this.outputs[output || 0].disconnect(node, 0, input);
    },

    remove: function() {
        var numberOfInputs = this.inputs.length;
        for (var i=0; i<numberOfInputs; i++) {
            this.inputs[i].remove();
        }

        for (var i=0; i<numberOfOutputs; i++) {
            this.outputs[i].remove();
        }
    }
});
