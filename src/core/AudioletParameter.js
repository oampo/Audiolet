var AudioletParameter = new Class({
    initialize: function(node, inputIndex, value) {
        this.node = node;
        if (typeof inputIndex != "undefined" && inputIndex != null) {
            this.input = node.inputs[inputIndex];
        }
        else {
            this.input = null;
        }
        this.value = value || 0;
    },

    setValue: function(value) {
        this.value = value;
    },

    getValue: function(index) {
        var input = this.input;
        if (input && input.isConnected()) {
            return(input.buffer.getChannelData(0)[index]);
        }
        else {
            return(this.value);
        }
    }
});
