var AudioletOutput = new Class({
    initialize: function(node, index) {
        this.node = node;
        this.index = index;
        this.connectedTo = [];
        // Minimum sized buffer, which we can resize from accordingly
        this.buffer = new AudioletBuffer(1, 1, node.audiolet.sampleRate);

        this.linkedInput = null;
        this.numberOfChannels = 1;
    },

    connect: function(input) {
        this.connectedTo.push(input);
    },

    disconnect: function(input) {
        var numberOfStreams = this.connectedTo.length;
        for (var i = 0; i < numberOfStreams; i++) {
            if (input == this.connectedTo[i]) {
                this.connectedTo.splice(i, 1);
                break;
            }
        }
    },

    isConnected: function() {
        return(this.connectedTo.length > 0);
    },

    link: function(input) {
        this.linkedInput = input;
    },

    unlink: function() {
        this.linkedInput = null;
    },

    getNumberOfChannels: function() {
        if (this.linkedInput && this.linkedInput.isConnected()) {
            return(this.linkedInput.buffer.numberOfChannels);
        }
        return(this.numberOfChannels);
    }
});

