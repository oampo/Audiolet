function AudioletDevice(audiolet) {
    // Mozilla?
    var tmpAudio = new Audio();
    var haveAudioDataAPI = (typeof tmpAudio.mozSetup == 'function');
    tmpAudio = null;
    if (haveAudioDataAPI) {
        return (new AudioDataAPIDevice(audiolet));
    }
    // Webkit?
    else if (typeof AudioContext != 'undefined') {
        return (new WebAudioAPIDevice(audiolet));
    }
    else {
        return (new DummyDevice(audiolet));
    }
}

