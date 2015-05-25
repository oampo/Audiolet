var Group = require('./group');
var Device = require('./device');
var Scheduler = require('./scheduler');
var UpMixer = require('../dsp/up-mixer');

/**
 * Group containing all of the components for the Audiolet output chain.  The
 * chain consists of:
 *
 *     Input => Scheduler => UpMixer => Output
 *
 * **Inputs**
 *
 * - Audio
 *
 * @constructor
 * @extends Group
 * @param {Audiolet} context The context object.
 * @param {Number} [numberOfChannels=2] The number of output channels.
 * @param {Number} [bufferSize] A fixed buffer size to use.
 */
var Destination = function(context, numberOfChannels,
                           bufferSize) {
    Group.call(this, context, 1, 0);

    this.device = new Device(context, numberOfChannels, bufferSize);
    context.device = this.device; // Shortcut
    this.scheduler = new Scheduler(context);
    context.scheduler = this.scheduler; // Shortcut

    this.upMixer = new UpMixer(context, this.device.numberOfChannels);

    this.inputs[0].connect(this.scheduler);
    this.scheduler.connect(this.upMixer);
    this.upMixer.connect(this.device);
};
Destination.prototype = Object.create(Group.prototype);
Destination.prototype.constructor = Group;

/**
 * toString
 *
 * @return {String} String representation.
 */
Destination.prototype.toString = function() {
    return 'Destination';
};

module.exports = Destination;
