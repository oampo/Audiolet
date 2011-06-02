var AudioletParameter = new Class({
    initialize: function(node, inputIndex, value) {
        this.node = node;
        if (typeof inputIndex != 'undefined' && inputIndex != null) {
            this.input = node.inputs[inputIndex];
        }
        else {
            this.input = null;
        }
        this.value = value || 0;
    },

    isStatic: function() {
        var input = this.input;
        return (input == null ||
                input.connectedFrom.length == 0 ||
                input.buffer.isEmpty);
    },

    isDynamic: function() {
        var input = this.input;
        return (input != null &&
                input.connectedFrom.length > 0 &&
                !input.buffer.isEmpty);
    },

    setValue: function(value) {
        this.value = value;
    },

    getValue: function() {
        return this.value;
    },

    getChannel: function() {
        return this.input.buffer.channels[0];
    }
});
