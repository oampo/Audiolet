var AudioletInput = new Class({
    initialize: function(node, index) {
        this.node = node;
        this.index = index;
        this.connectedFrom = [];
        // Minimum sized buffer, which we can resize from accordingly
        this.buffer = new AudioletBuffer(1, 1, node.audiolet.sampleRate);
    },

    connect: function(output) {
        this.connectedFrom.push(output);
    },

    disconnect: function(output) {
        var numberOfStreams = this.connectedFrom.length;
        for (var i = 0; i < numberOfStreams; i++) {
            if (output == this.connectedFrom[i]) {
                this.connectedFrom.splice(i, 1);
                break;
            }
        }
    },

    isConnected: function() {
        return(this.connectedFrom.length > 0);
    }
});

