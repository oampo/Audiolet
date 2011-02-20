var Envelope = new Class({
    Extends: AudioletNode,
    initialize: function(audiolet, gate, levels, times, releaseStage,
                         onComplete) {
        AudioletNode.prototype.initialize.apply(this, [audiolet, 1, 1]);
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
    },

    generate: function(inputBuffers, outputBuffers) {
        var buffer = outputBuffers[0];
        var channel = buffer.getChannelData(0);

        var gateParameter = this.gate;
        var releaseStage = this.releaseStage;

        var stage = this.stage;
        var time = this.time;
        var changeTime = this.changeTime;

        var level = this.level;
        var delta = this.delta;
        var gateOn = this.gateOn;

        var stageChanged = false;
        
        var bufferLength = buffer.length;
        for (var i=0; i<bufferLength; i++) {
            var gate = gateParameter.getValue();

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
                if (releaseStage != null) {
                    // Jump to the release stage
                    stage = releaseStage;
                    stageChanged = true;
                }
            }

            if (changeTime) {
                // We are not sustaining, and we are playing, so increase the
                // time
                time += 1;
                if (time == changeTime) {
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
    },

    calculateDelta: function(stage, level) {
        var delta = this.levels[stage + 1] - level;
        var stageTime = this.times[stage] * this.audiolet.sampleRate;
        return (delta / stageTime);
    },

    calculateChangeTime: function(stage, time) {
        var stageTime = this.times[stage] * this.audiolet.sampleRate;
        return(time + stageTime);
    }
});
