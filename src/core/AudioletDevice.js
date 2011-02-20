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
    else if (typeof AudioContext != 'undefined') {
        return (new WebAudioAPIDevice(audiolet, sampleRate, numberOfChannels,
                                      bufferSize));
    }
    else {
        return (new DummyDevice(audiolet, sampleRate, numberOfChannels,
                                bufferSize));
    }
}

