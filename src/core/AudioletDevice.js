/**
 * Audio output device factory.  Selects which type of devices to use depending
 * on which API is available.
 *
 * @param {Audiolet} audiolet The audiolet object.
 * @param {Number} [sampleRate=44100] The sample rate to run at.
 * @param {Number} [numberOfChannels=2] The number of output channels.
 * @param {Number} [bufferSize=8192] A fixed buffer size to use.
 * @return {AbstractAudioletDevice} The output device.
 */
function AudioletDevice(audiolet, sampleRate, numberOfChannels, bufferSize) {
    // Mozilla?
    var tmpAudio = new Audio();
    var haveAudioDataAPI = (typeof tmpAudio.mozSetup == 'function');
    tmpAudio = null;
    if (haveAudioDataAPI) {
        return (new AudioDataAPIDevice(audiolet, sampleRate, numberOfChannels,
                                       bufferSize));
    }
    // Webkit?
    else if (typeof AudioContext != 'undefined' ||
             typeof webkitAudioContext != 'undefined') {
        return (new WebAudioAPIDevice(audiolet, sampleRate, numberOfChannels,
                                      bufferSize));
    }
    else {
        return (new DummyDevice(audiolet, sampleRate, numberOfChannels,
                                bufferSize));
    }
}

