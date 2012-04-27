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

    this.levels = [];
    for (var i=0; i<levels.length; i++) {
        this.levels.push(new AudioletParameter(this, null, levels[i]));
    }

    this.times = [];
    for (var i=0; i<times.length; i++) {
        this.times.push(new AudioletParameter(this, null, times[i]));
    }

    this.releaseStage = releaseStage;
    this.onComplete = onComplete;

    this.stage = null;
    this.time = null;
    this.changeTime = null;

    this.level = this.levels[0].getValue();
    this.delta = 0;
    this.gateOn = false;
};
extend(Envelope, AudioletNode);

/**
 * Process samples
 */
Envelope.prototype.generate = function() {
    var gate = this.gate.getValue();

    var stageChanged = false;

    if (gate && !this.gateOn) {
        // Key pressed
        this.gateOn = true;
        this.stage = 0;
        this.time = 0;
        this.delta = 0;
        this.level = this.levels[0].getValue();
        if (this.stage != this.releaseStage) {
            stageChanged = true;
        }
    }

    if (this.gateOn && !gate) {
        // Key released
        this.gateOn = false;
        if (this.releaseStage != null) {
            // Jump to the release stage
            this.stage = this.releaseStage;
            stageChanged = true;
        }
    }

    if (this.changeTime) {
        // We are not sustaining, and we are playing, so increase the
        // time
        this.time += 1;
        if (this.time >= this.changeTime) {
            // Need to go to the next stage
            this.stage += 1;
            if (this.stage != this.releaseStage) {
                stageChanged = true;
            }
            else {
                // If we reach the release stage then sustain the value
                // until the gate is released rather than moving on
                // to the next level.
                this.changeTime = null;
                this.delta = 0;
            }
        }
    }

    if (stageChanged) {
//        level = this.levels[stage];
        if (this.stage != this.times.length) {
            // Actually update the variables
            this.delta = this.calculateDelta(this.stage, this.level);
            this.changeTime = this.calculateChangeTime(this.stage, this.time);
        }
        else {
            // Made it to the end, so finish up
            if (this.onComplete) {
                this.onComplete();
            }
            this.stage = null;
            this.time = null;
            this.changeTime = null;

            this.delta = 0;
        }
    }

    this.level += this.delta;
    this.outputs[0].samples[0] = this.level;
};

/**
 * Calculate the change in level needed each sample for a section
 *
 * @param {Number} stage The index of the current stage.
 * @param {Number} level The current level.
 * @return {Number} The change in level.
 */
Envelope.prototype.calculateDelta = function(stage, level) {
    var delta = this.levels[stage + 1].getValue() - level;
    var stageTime = this.times[stage].getValue() *
                    this.audiolet.device.sampleRate;
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
    var stageTime = this.times[stage].getValue() *
                    this.audiolet.device.sampleRate;
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
