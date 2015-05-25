var Node = require('./node');

/**
 * Audio output device.  Uses sink.js to output to a range of APIs.
 *
 * @constructor
 * @param {Audiolet} context The context object.
 * @param {Number} [numberOfChannels=2] The number of output channels.
 * @param {Number} [bufferSize=8192] A fixed buffer size to use.
 */
function Device(context, numberOfChannels, bufferSize) {
    Node.call(this, context, 1, 0);
    this.numberOfChannels = numberOfChannels || 2;

    // Round bufferSize to nearest power of 2
    bufferSize = bufferSize || 8192;
    var roundedBufferSize = 1;
    while (roundedBufferSize < bufferSize) {
        roundedBufferSize *= 2;
    }
    this.bufferSize = roundedBufferSize;

    this.context = new AudioContext();

    this.sampleRate = this.context.sampleRate;

    this.scriptProcessor = this.context.createScriptProcessor(
        this.bufferSize, 0, this.numberOfChannels
    );
    this.scriptProcessor.onaudioprocess = this.tick.bind(this);
    this.scriptProcessor.connect(this.context.destination);

    this.writePosition = 0;
    this.buffer = null;
    this.paused = false;

    this.needTraverse = true;
    this.nodes = [];
}
Device.prototype = Object.create(Node.prototype);
Device.prototype.constructor = Node;

/**
* Overridden tick function. Pulls data from the input and writes it to the
* device.
*
* @param {Float32Array} buffer Buffer to write data to.
* @param {Number} numberOfChannels Number of channels in the buffer.
*/
Device.prototype.tick = function(event) {
    if (this.paused) {
        return;
    }

    var buffer = event.outputBuffer;

    var input = this.inputs[0];

    var channels = []
    for (var i = 0; i < buffer.numberOfChannels; i++) {
        channels.push(buffer.getChannelData(i));
    }

    for (var i = 0; i < buffer.length; i++) {
        if (this.needTraverse) {
            this.nodes = this.traverse([]);
            this.needTraverse = false;
        }

        // Tick in reverse order up to, but not including this node
        for (var j = this.nodes.length - 1; j > 0; j--) {
            this.nodes[j].tick();
        }
        // Cut down tick to just sum the input samples
        this.createInputSamples();

        for (var j = 0; j < buffer.numberOfChannels; j++) {
            channels[j][i] = input.samples[j];
        }

        this.writePosition += 1;
    }
};

/**
 * Get the current output position
 *
 * @return {Number} Output position in samples.
 */
Device.prototype.getPlaybackTime = function() {
    return this.context.currentTime;
};

/**
 * Get the current write position
 *
 * @return {Number} Write position in samples.
 */
Device.prototype.getWriteTime = function() {
    return this.writePosition;
};

/**
 * Pause the output stream, and stop everything from ticking.  The playback
 * time will continue to increase, but the write time will be paused.
 */
Device.prototype.pause = function() {
    this.paused = true;
};

/**
 * Restart the output stream.
 */
Device.prototype.play = function() {
   this.paused = false; 
};

/**
 * toString
 *
 * @return {String} String representation.
 */
Device.prototype.toString = function() {
    return 'Audio Output Device';
};

module.exports = Device;
