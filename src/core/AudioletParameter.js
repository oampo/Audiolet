/**
 * AudioletParameters are used to provide either constant or varying values to
 * be used inside AudioletNodes.  AudioletParameters hold a static value, and
 * can also be linked to an AudioletInput.  If a node or group is connected to
 * the linked input, then the dynamic value taken from the node should be
 * prioritised over the stored static value.  If no node is connected then the
 * static value should be used.
 *
 * @constructor
 * @param {AudioletNode} node The node which the parameter is associated with.
 * @param {Number} [inputIndex] The index of the AudioletInput to link to.
 * @param {Number} [value=0] The initial static value to store.
 */
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

/**
 * Check whether the static value should be used.
 *
 * @return {Boolean} True if the static value should be used.
 */
AudioletParameter.prototype.isStatic = function() {
    var input = this.input;
    return (input == null ||
            input.connectedFrom.length == 0 ||
            input.buffer.isEmpty);
};

/**
 * Check whether the dynamic values should be used.
 *
 * @return {Boolean} True if the dynamic values should be used.
 */
AudioletParameter.prototype.isDynamic = function() {
    var input = this.input;
    return (input != null &&
            input.connectedFrom.length > 0 &&
            !input.buffer.isEmpty);
};

/**
 * Set the stored static value
 *
 * @param {Number} value The value to store.
 */
AudioletParameter.prototype.setValue = function(value) {
    this.value = value;
};

/**
 * Get the stored static value
 *
 * @return {Number} The stored static value.
 */
AudioletParameter.prototype.getValue = function() {
    return this.value;
};

/**
 * Get the channel containing the dynamic values taken from the linked input
 *
 * @return {Float32Array} The channel containing the dynamic values.
 */
AudioletParameter.prototype.getChannel = function() {
    return this.input.buffer.channels[0];
};
