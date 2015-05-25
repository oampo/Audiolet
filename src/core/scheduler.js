var Heap = require('heap');

var PassThroughNode = require('./pass-through-node');
var Pattern = require('../pattern/pattern');

/**
 * A sample-accurate scheduler built as an Node.  The scheduler works
 * by storing a heap of events, and running callback functions when the
 * correct sample is being processed.  All timing and events are handled in
 * beats, which are converted to sample positions using a master tempo.
 *
 * **Inputs**
 *
 * - Audio
 *
 * **Outputs**
 *
 * - Audio
 *
 * @constructor
 * @extends PassThroughNode
 * @param {Audiolet} context The context object.
 * @param {Number} [bpm=120] Initial tempo.
 */
var Scheduler = function(context, bpm) {
    PassThroughNode.call(this, context, 1, 1);
    this.linkNumberOfOutputChannels(0, 0);
    this.bpm = bpm || 120;
    this.heap = new Heap(function(a, b) {
        return (a.time - b.time);
    });

    this.time = 0;
    this.beat = 0;
    this.beatInBar = 0;
    this.bar = 0;
    this.seconds = 0;
    this.beatsPerBar = 0;

    this.lastBeatTime = 0;
    this.beatLength = 60 / this.bpm * this.context.device.sampleRate;
};
Scheduler.prototype = Object.create(PassThroughNode.prototype);
Scheduler.prototype.constructor = PassThroughNode;

/**
 * Set the tempo of the scheduler.
 *
 * @param {Number} bpm The tempo in beats per minute.
 */
Scheduler.prototype.setTempo = function(bpm) {
    this.bpm = bpm;
    this.beatLength = 60 / this.bpm * this.context.device.sampleRate;
};

/**
 * Add an event relative to the current write position
 *
 * @param {Number} beats How many beats in the future to schedule the event.
 * @param {Function} callback A function called when it is time for the event.
 * @return {Object} The event object.
 */
Scheduler.prototype.addRelative = function(beats, callback) {
    var event = {};
    event.callback = callback;
    event.time = this.time + beats * this.beatLength;
    this.heap.push(event);
    return event;
};

/**
 * Add an event at an absolute beat position
 *
 * @param {Number} beat The beat at which the event should take place.
 * @param {Function} callback A function called when it is time for the event.
 * @return {Object} The event object.
 */
Scheduler.prototype.addAbsolute = function(beat, callback) {
    if (beat < this.beat ||
        beat == this.beat && this.time > this.lastBeatTime) {
        // Nah
        return null;
    }
    var event = {};
    event.callback = callback;
    event.time = this.lastBeatTime + (beat - this.beat) * this.beatLength;
    this.heap.push(event);
    return event;
};

/**
 * Schedule patterns to play, and provide the values generated to a callback.
 * The durationPattern argument can be either a number, giving a constant time
 * between each event, or a pattern, allowing varying time difference.
 *
 * @param {Pattern[]} patterns An array of patterns to play.
 * @param {Pattern|Number} durationPattern The number of beats between events.
 * @param {Function} callback Function called with the generated pattern values.
 * @return {Object} The event object.
 */
Scheduler.prototype.play = function(patterns, durationPattern, callback) {
    var event = {};
    event.patterns = patterns;
    event.durationPattern = durationPattern;
    event.callback = callback;
    // TODO: Quantizing start time
    event.time = this.context.device.getWriteTime();
    this.heap.push(event);
    return event;
};

/**
 * Schedule patterns to play starting at an absolute beat position,
 * and provide the values generated to a callback.
 * The durationPattern argument can be either a number, giving a constant time
 * between each event, or a pattern, allowing varying time difference.
 *
 * @param {Number} beat The beat at which the event should take place.
 * @param {Pattern[]} patterns An array of patterns to play.
 * @param {Pattern|Number} durationPattern The number of beats between events.
 * @param {Function} callback Function called with the generated pattern values.
 * @return {Object} The event object.
 */
Scheduler.prototype.playAbsolute = function(beat, patterns, durationPattern,
                                            callback) {
    if (beat < this.beat ||
        beat == this.beat && this.time > this.lastBeatTime) {
        // Nah
        return null;
    }
    var event = {};
    event.patterns = patterns;
    event.durationPattern = durationPattern;
    event.callback = callback;
    event.time = this.lastBeatTime + (beat - this.beat) * this.beatLength;
    event.removed = false;
    this.heap.push(event);
    return event;
};


/**
 * Remove a scheduled event from the scheduler
 *
 * @param {Object} event The event to remove.
 */
Scheduler.prototype.remove = function(event) {
    event.removed = true;
};

/**
 * Alias for remove, so for simple events we have add/remove, and for patterns
 * we have play/stop.
 *
 * @param {Object} event The event to remove.
 */
Scheduler.prototype.stop = function(event) {
    this.remove(event);
};

/**
 * Overridden tick method.  Process any events which are due to take place
 * either now or previously.
 */
Scheduler.prototype.tick = function() {
    PassThroughNode.prototype.tick.call(this);
    this.tickClock();

    while (!this.heap.empty() &&
           this.heap.peek().time <= this.time) {
        var event = this.heap.pop();
        if (event.removed) {
            continue;
        }
        this.processEvent(event);
    }
};

/**
 * Update the various representations of time within the scheduler.
 */
Scheduler.prototype.tickClock = function() {
    this.time += 1;
    this.seconds = this.time / this.context.device.sampleRate;
    if (this.time >= this.lastBeatTime + this.beatLength) {
        this.beat += 1;
        this.beatInBar += 1;
        if (this.beatInBar == this.beatsPerBar) {
            this.bar += 1;
            this.beatInBar = 0;
        }
        this.lastBeatTime += this.beatLength;
    }
};

/**
 * Process a single event, grabbing any necessary values, calling the event's
 * callback, and rescheduling it if necessary.
 *
 * @param {Object} event The event to process.
 */
Scheduler.prototype.processEvent = function(event) {
    var durationPattern = event.durationPattern;
    if (durationPattern) {
        // Pattern event
        var args = [];
        var patterns = event.patterns;
        var numberOfPatterns = patterns.length;
        for (var i = 0; i < numberOfPatterns; i++) {
            var pattern = patterns[i];
            var value = pattern.next();
            if (value != null) {
                args.push(value);
            }
            else {
                // Null value for an argument, so don't process the
                // callback or add any further events
                return;
            }
        }
        event.callback.apply(null, args);

        var duration;
        if (durationPattern instanceof Pattern) {
            duration = durationPattern.next();
        }
        else {
            duration = durationPattern;
        }

        if (duration) {
            // Beats -> time
            event.time += duration * this.beatLength;
            this.heap.push(event);
        }
    }
    else {
        // Regular event
        event.callback();
    }
};

/**
 * toString
 *
 * @return {String} String representation.
 */
Scheduler.prototype.toString = function() {
    return 'Scheduler';
};

module.exports = Scheduler;
