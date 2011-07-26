/*!
 * @depends AudioletNode.js
 */

/**
 * A sample-accurate scheduler built as an AudioletNode.  The scheduler works
 * by storing a queue of events, and subdividing the tick call from the
 * AudioletDevice if an event is scheduled to happen during the tick.  Any
 * buffers obtained in subdivided ticks are finally merged to produce the
 * single buffer expected at the output.  All timing and events are handled in
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
 * @extends AudioletNode
 * @param {Audiolet} audiolet The audiolet object.
 * @param {Number} [bpm=120] Initial tempo.
 */
var Scheduler = function(audiolet, bpm) {
    AudioletNode.call(this, audiolet, 1, 1);
    this.linkNumberOfOutputChannels(0, 0);
    this.bpm = bpm || 120;
    this.queue = new PriorityQueue(null, function(a, b) {
        return (a.time < b.time);
    });

    this.time = 0;
    this.beat = 0;
    this.beatInBar = 0;
    this.bar = 0;
    this.seconds = 0;
    this.beatsPerBar = 0;

    this.lastBeatTime = 0;
    this.beatLength = 60 / this.bpm * this.audiolet.device.sampleRate;

    this.emptyBuffer = new AudioletBuffer(1, 1);
};
extend(Scheduler, AudioletNode);

/**
 * Set the tempo of the scheduler.
 *
 * @param {Number} bpm The tempo in beats per minute.
 */
Scheduler.prototype.setTempo = function(bpm) {
    this.bpm = bpm;
    this.beatLength = 60 / this.bpm * this.audiolet.device.sampleRate;
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
    this.queue.push(event);
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
    this.queue.push(event);
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
    event.time = this.audiolet.device.getWriteTime();
    this.queue.push(event);
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
    this.queue.push(event);
    return event;
};


/**
 * Remove a scheduled event from the scheduler
 *
 * @param {Object} event The event to remove.
 */
Scheduler.prototype.remove = function(event) {
    var idx = this.queue.heap.indexOf(event);
    if (idx != -1) {
        this.queue.heap.splice(idx, 1);
        // Recreate queue with event removed
        this.queue = new PriorityQueue(this.queue.heap, function(a, b) {
            return (a.time < b.time);
        });
    }
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
 * Overridden tick method.  This is where the scheduler magic of splitting down
 * blocks allows sample-accurate changes to happen, and also where we process
 * the events themselves.
 *
 * @param {Number} length The number of samples to process.
 * @param {Number} timestamp A timestamp for the block of samples.
 */
Scheduler.prototype.tick = function(length, timestamp) {
    // The time at the beginning of the block
    var startTime = this.audiolet.device.getWriteTime();

    // Update the clock so it is correct for the first samples
    this.updateClock(startTime);

    // Don't create the output buffer yet - it needs to be created after
    // the first input buffer so we can work out how many channels it needs
    var outputBuffers = null;

    // Generate the block of samples and carry out events, generating a
    // new sub-block each time an event is carried out
    var lastEventTime = startTime;
    while (!this.queue.isEmpty() &&
           this.queue.peek().time <= startTime + length) {
        var event = this.queue.pop();
        // Event can't take place before the previous event
        var eventTime = Math.floor(Math.max(event.time, lastEventTime));

        // Generate samples to take us to the event
        var timeToEvent = eventTime - lastEventTime;
        if (timeToEvent > 0) {
            var offset = lastEventTime - startTime;
            this.tickParents(timeToEvent,
                             timestamp + offset);

            // Get the summed input
            var inputBuffers = this.createInputBuffers(timeToEvent);

            // Create the output buffer
            if (!outputBuffers) {
                var outputBuffers = this.createOutputBuffers(length);
            }

            // Copy it to the right part of the output
            // Use the generate function so it looks and quacks like an
            // AudioletNode
            this.generate(inputBuffers, outputBuffers, offset);
        }

        // Update the clock so it is correct for the current event
        this.updateClock(eventTime);


        // Set this before processEvent, as that can change the event time
        lastEventTime = eventTime;
        // Carry out the event
        this.processEvent(event);
    }

    // Generate enough samples to complete the block
    var remainingTime = startTime + length - lastEventTime;
    if (remainingTime) {
        this.tickParents(remainingTime,
                         timestamp + lastEventTime - startTime);
        var inputBuffers = this.createInputBuffers(remainingTime);

        // Make sure we have an output buffer
        if (!outputBuffers) {
            var outputBuffers = this.createOutputBuffers(length);
        }

        var offset = lastEventTime - startTime;
        this.generate(inputBuffers, outputBuffers, offset);
    }
};

/**
 * Update the various representations of time within the scheduler.
 *
 * @param {Number} time The current write position in samples.
 */
Scheduler.prototype.updateClock = function(time) {
    this.time = time;
    this.seconds = this.time * this.audiolet.device.sampleRate;
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
            this.queue.push(event);
        }
    }
    else {
        // Regular event
        event.callback();
    }
};

/**
 * Overridden function reading from the input buffers, and putting new values
 * into sections of the output buffers.  Also handles buffers which are flagged
 * as being empty, converting them into actual zeroed buffers.
 *
 * @param {AudioletBuffer[]} inputBuffers Samples received from the inputs.
 * @param {AudioletBuffer[]} outputBuffers Samples to be sent to the outputs.
 * @param {Number} offset Sample offset for writing to the output buffers.
 */
Scheduler.prototype.generate = function(inputBuffers, outputBuffers, offset) {
    var inputBuffer = inputBuffers[0];
    var outputBuffer = outputBuffers[0];
    for (var i = 0; i < inputBuffer.numberOfChannels; i++) {
        var inputChannel;
        if (inputBuffer.isEmpty) {
            // Substitute the supposedly empty buffer with an actually
            // empty buffer.  This means that we don't have to  zero
            // buffers in other nodes
            var emptyBuffer = this.emptyBuffer;
            emptyBuffer.resize(inputBuffer.numberOfChannels,
                               inputBuffer.length);
            inputChannel = emptyBuffer.getChannelData(0);
        }
        else {
            inputChannel = inputBuffer.getChannelData(i);
        }
        var outputChannel = outputBuffer.getChannelData(i);
        outputChannel.set(inputChannel, offset);
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
