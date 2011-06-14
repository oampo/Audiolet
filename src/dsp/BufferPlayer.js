/*!
 * @depends ../core/AudioletNode.js
 */

/**
 * Play the contents of an audio buffer
 *
 * **Inputs**
 *
 * - Playback rate
 * - Restart trigger
 * - Start position
 * - Loop on/off
 *
 * **Outputs**
 *
 * - Audio
 *
 * **Parameters**
 *
 * - playbackRate The rate that the buffer should play at.  Value of 1 plays at
 * the regular rate.  Values > 1 are pitched up.  Values < 1 are pitched down.
 * Linked to input 0.
 * - restartTrigger Changes of value from 0 -> 1 restart the playback from the
 * start position.  Linked to input 1.
 * - startPosition The position at which playback should begin.  Values between
 * 0 (the beginning of the buffer) and 1 (the end of the buffer).  Linked to
 * input 2.
 * - loop Whether the buffer should loop when it reaches the end.  Linked to
 * input 3
 *
 * @constructor
 * @extends AudioletNode
 * @param {Audiolet} audiolet The audiolet object.
 * @param {AudioletBuffer} buffer The buffer to play.
 * @param {Number} [playbackRate=1] The initial playback rate.
 * @param {Number} [startPosition=0] The initial start position.
 * @param {Number} [loop=0] Initial value for whether to loop.
 */
var BufferPlayer = function(audiolet, buffer, playbackRate, startPosition,
                            loop) {
    AudioletNode.call(this, audiolet, 3, 1);
    this.buffer = buffer;
    this.setNumberOfOutputChannels(0, this.buffer.numberOfChannels);
    this.position = startPosition || 0;
    this.playbackRate = new AudioletParameter(this, 0, playbackRate || 1);
    this.restartTrigger = new AudioletParameter(this, 1, 0);
    this.startPosition = new AudioletParameter(this, 2, startPosition || 0);
    this.loop = new AudioletParameter(this, 3, loop || 0);

    this.restartTriggerOn = false;
    this.playing = true;
};
extend(BufferPlayer, AudioletNode);

/**
 * Process a block of samples
 *
 * @param {AudioletBuffer[]} inputBuffers Samples received from the inputs.
 * @param {AudioletBuffer[]} outputBuffers Samples to be sent to the outputs.
 */
BufferPlayer.prototype.generate = function(inputBuffers, outputBuffers) {
    var outputBuffer = outputBuffers[0];

    // Cache local variables
    var buffer = this.buffer;
    var position = this.position;
    var playing = this.playing;
    var restartTriggerOn = this.restartTriggerOn;

    // Crap load of parameters
    var playbackRateParameter = this.playbackRate;
    var playbackRate, playbackRateChannel;
    if (playbackRateParameter.isStatic()) {
        playbackRate = playbackRateParameter.getValue();
    }
    else {
        playbackRateChannel = playbackRateParameter.getChannel();
    }

    var restartTriggerParameter = this.restartTrigger;
    var restartTrigger, restartTriggerChannel;
    if (restartTriggerParameter.isStatic()) {
        restartTrigger = restartTriggerParameter.getValue();
    }
    else {
        restartTriggerChannel = restartTriggerParameter.getChannel();
    }

    var startPositionParameter = this.startPosition;
    var startPosition, startPositionChannel;
    if (startPositionParameter.isStatic()) {
        startPosition = startPositionParameter.getValue();
    }
    else {
        startPositionChannel = startPositionParameter.getChannel();
    }

    var loopParameter = this.loop;
    var loop, loopChannel;
    if (loopParameter.isStatic()) {
        loop = loopParameter.getValue();
    }
    else {
        loopChannel = loopParameter.getChannel();
    }


    if (buffer.length == 0 || (!restartTriggerChannel && !playing)) {
        // No buffer data, or chance of starting playing in this block, so
        // we can just send an empty buffer and return
        outputBuffer.isEmpty = true;
        return;
    }

    var numberOfChannels = buffer.numberOfChannels;
    var bufferLength = outputBuffer.length;
    for (var i = 0; i < bufferLength; i++) {
        if (playbackRateChannel) {
            playbackRate = playbackRateChannel[i];
        }
        if (restartTriggerChannel) {
            restartTrigger = restartTriggerChannel[i];
        }
        if (loopChannel) {
            loop = loopChannel[i];
        }

        if (restartTrigger > 0 && !restartTriggerOn) {
            // Trigger moved from <=0 to >0, so we restart playback from
            // startPosition
            position = startPosition;
            restartTriggerOn = true;
            playing = true;
        }

        if (restartTrigger <= 0 && restartTriggerOn) {
            // Trigger moved back to <= 0
            restartTriggerOn = false;
        }

        if (playing) {
            for (var j = 0; j < numberOfChannels; j++) {
                var inputChannel = buffer.channels[j];
                var outputChannel = outputBuffer.channels[j];
                outputChannel[i] = inputChannel[Math.floor(position)];
            }
            position += playbackRate;
            if (position >= buffer.length) {
                if (loop) {
                    // Back to the start
                    position %= buffer.length;
                }
                else {
                    // Finish playing until a new restart trigger
                    playing = false;
                }
            }
        }
        else {
            // Give zeros until we restart
            for (var j = 0; j < numberOfChannels; j++) {
                var outputChannel = outputBuffer.channels[j];
                outputChannel[i] = 0;
            }
        }
    }

    this.playing = playing;
    this.position = position;
    this.restartTriggerOn = restartTriggerOn;
};

/**
 * toString
 *
 * @return {String} String representation.
 */
BufferPlayer.prototype.toString = function() {
    return ('Buffer player');
};
