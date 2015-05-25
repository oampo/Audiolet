var Node = require('../core/node');
var Parameter = require('../core/parameter');

/**
 * Simple trigger which allows you to set a single sample to be 1 and then
 * resets itself.
 *
 * **Outputs**
 *
 * - Triggers
 *
 * **Parameters**
 *
 * - trigger Set to 1 to fire a trigger.
 *
 * @constructor
 * @extends Node
 * @param {Audiolet} context The context object.
 * @param {Number} [trigger=0] The initial trigger state.
 */
var TriggerControl = function(context, trigger) {
    Node.call(this, context, 0, 1);
    this.trigger = new Parameter(this, null, trigger || 0);
};
TriggerControl.prototype = Object.create(Node.prototype);
TriggerControl.prototype.constructor = TriggerControl;

/**
 * Process samples
 */
TriggerControl.prototype.generate = function() {
    if (this.trigger.getValue() > 0) {
        this.outputs[0].samples[0] = 1;
        this.trigger.setValue(0);
    }
    else {
        this.outputs[0].samples[0] = 0;
    }
};

/**
 * toString
 *
 * @return {String} String representation.
 */
TriggerControl.prototype.toString = function() {
    return 'Trigger Control';
};

module.exports = TriggerControl;
