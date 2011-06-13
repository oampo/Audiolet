var AudioletParameter = function(node, inputIndex, value) {
    this.node = node;
    if (typeof inputIndex != 'undefined' && inputIndex != null) {
        this.input = node.inputs[inputIndex];
    }
    else {
        this.input = null;
    }
    this.value = value || 0;
};

AudioletParameter.prototype.isStatic = function() {
    var input = this.input;
    return (input == null ||
            input.connectedFrom.length == 0 ||
            input.buffer.isEmpty);
};

AudioletParameter.prototype.isDynamic = function() {
    var input = this.input;
    return (input != null &&
            input.connectedFrom.length > 0 &&
            !input.buffer.isEmpty);
};

AudioletParameter.prototype.setValue = function(value) {
    this.value = value;
};

AudioletParameter.prototype.getValue = function() {
    return this.value;
};

AudioletParameter.prototype.getChannel = function() {
    return this.input.buffer.channels[0];
};
