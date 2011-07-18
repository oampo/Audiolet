/*!
 * @depends ../core/AudioletNode.js
 */

/**
 * A generic envelope consisting of linear transitions of varying duration
 * between a series of values.
 *
 * **Inputs**
 *
 * - Gate
 *
 * **Outputs**
 *
 * - Envelope
 *
 * **Parameters**
 *
 * - gate Gate controlling the envelope.  Values should be 0 (off) or 1 (on).
 * Linked to input 0.
 *
 * @constructor
 * @extends AudioletNode
 * @param {Audiolet} audiolet The audiolet object.
 * @param {Number} [gate=1] Initial gate value.
 * @param {Number[]} levels An array (of length n) of values to move between.
 * @param {Number[]} times An array of n-1 durations - one for each transition.
 * @param {Number} [releaseStage] Sustain at this stage until the the gate is 0.
 * @param {Function} [onComplete] Function called as the envelope finishes.
 */
var Envelope = function(audiolet, gate, levels, times, releaseStage,
                        onComplete) {
    AudioletNode.call(this, audiolet, 1, 1);
    this.gate = new AudioletParameter(this, 0, gate || 1);

    this.levels = levels;
    this.times = times;
    this.releaseStage = releaseStage;
    this.onComplete = onComplete;

    this.stage = null;
    this.time = null;
    this.changeTime = null;

    this.level = 0;
    this.delta = 0;
    this.gateOn = false;
};
extend(Envelope, AudioletNode);

/**
 * Process a block of samples
 *
 * @param {AudioletBuffer[]} inputBuffers Samples received from the inputs.
 * @param {AudioletBuffer[]} outputBuffers Samples to be sent to the outputs.
 */
Envelope.prototype.generate = function(inputBuffers, outputBuffers) {
    var buffer = outputBuffers[0];
    var channel = buffer.getChannelData(0);

    var gateParameter = this.gate;
    var gate, gateChannel;
    if (gateParameter.isStatic()) {
        gate = gateParameter.getValue();
    }
    else {
        gateChannel = gateParameter.getChannel();
    }
    var releaseStage = this.releaseStage;

    var stage = this.stage;
    var time = this.time;
    var changeTime = this.changeTime;

    var level = this.level;
    var delta = this.delta;
    var gateOn = this.gateOn;

    var stageChanged = false;

    var bufferLength = buffer.length;
    for (var i = 0; i < bufferLength; i++) {
        if (gateChannel) {
            gate = gateChannel[i];
        }

        if (gate && !gateOn) {
            // Key pressed
            gateOn = true;
            stage = 0;
            time = 0;
            stageChanged = true;
        }

        if (gateOn && !gate) {
            // Key released
            gateOn = false;
            if (releaseStage) {
                // Jump to the release stage
                stage = releaseStage;
                stageChanged = true;
            }
        }

        if (changeTime) {
            // We are not sustaining, and we are playing, so increase the
            // time
            time += 1;
            if (time >= changeTime) {
                // Need to go to the next stage
                stage += 1;
                if (stage != releaseStage) {
                    stageChanged = true;
                }
                else {
                    // If we reach the release stage then sustain the value
                    // until the gate is released rather than moving on
                    // to the next level.
                    changeTime = null;
                    delta = 0;
                }
            }
        }

        if (stageChanged) {
//            level = this.levels[stage];
            if (stage != this.times.length) {
                // Actually update the variables
                delta = this.calculateDelta(stage, level);
                changeTime = this.calculateChangeTime(stage, time);
            }
            else {
                // Made it to the end, so finish up
                if (this.onComplete) {
                    this.onComplete();
                }
                stage = null;
                time = null;
                changeTime = null;

                delta = 0;
            }
            stageChanged = false;
        }

        level += delta;
        channel[i] = level;
    }

    this.stage = stage;
    this.time = time;
    this.changeTime = changeTime;

    this.level = level;
    this.delta = delta;
    this.gateOn = gateOn;
};

/**
 * Calculate the change in level needed each sample for a section
 *
 * @param {Number} stage The index of the current stage.
 * @param {Number} level The current level.
 * @return {Number} The change in level.
 */
Envelope.prototype.calculateDelta = function(stage, level) {
    var delta = this.levels[stage + 1] - level;
    var stageTime = this.times[stage] * this.audiolet.device.sampleRate;
    return (delta / stageTime);
};

/**
 * Calculate the time in samples at which the next stage starts
 *
 * @param {Number} stage The index of the current stage.
 * @param {Number} time The current time.
 * @return {Number} The change time.
 */
Envelope.prototype.calculateChangeTime = function(stage, time) {
    var stageTime = this.times[stage] * this.audiolet.device.sampleRate;
    return (time + stageTime);
};

/**
 * toString
 *
 * @return {String} String representation.
 */
Envelope.prototype.toString = function() {
    return 'Envelope';
};
