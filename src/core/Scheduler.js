/**
 * @depends AudioletNode.js
 */

var Scheduler = new Class({
    Extends: AudioletNode,
    initialize: function(audiolet, bpm) {
        AudioletNode.prototype.initialize.apply(this, [audiolet, 1, 1]);
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

        var emptyBuffer = new AudioletBuffer(1, 1);
    },

    addRelative: function(beats, callback) {
        var event = {};
        event.callback = callback;
        event.time = this.time + beats * this.beatLength;
        this.queue.push(event);
        return event;
    },

    addAbsolute: function(beat, callback) {
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
    },

    play: function(patterns, durationPattern, callback) {
        var event = {};
        event.patterns = patterns;
        event.durationPattern = durationPattern;
        event.callback = callback;
        // TODO: Quantizing start time
        event.time = this.audiolet.device.getWriteTime();
        this.queue.push(event);
    },

    remove: function() {
    },

    tick: function(length, timestamp) {
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

            // Generate samples to take us to the event
            var timeToEvent = event.time - lastEventTime;
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
            this.updateClock(event.time);


            // Set this before processEvent, as that can change the event time
            lastEventTime = event.time;
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
    },

    updateClock: function(time) {
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
    },

    processEvent: function(event) {
        var durationPattern = event.durationPattern;
        if (durationPattern) {
            // Pattern event
            var args = [];
            var patterns = event.patterns;
            var numberOfPatterns = patterns.length;
            for (var i=0; i<numberOfPatterns; i++) {
                var pattern = patterns[i];
                args.push(pattern.next());
            }
            event.callback.apply(null, args);

            var duration;
            if (instanceOf(durationPattern, Pattern)) {
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
    },

    generate: function(inputBuffers, outputBuffers, offset) {
        var inputBuffer = inputBuffers[0];
        var outputBuffer = outputBuffers[0];
        for (var i = 0; i < inputBuffer.numberOfChannels; i++) {
            var inputChannel;
            if (inputBuffer.isEmpty) {
                // Substitute the supposedly empty buffer with an actually
                // empty buffer.  This means that we don't have to  zero
                // buffers in other nodes
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
    },

    toString: function() {
        return "Scheduler";
    }
});
