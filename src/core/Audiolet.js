var Audiolet = function(sampleRate, numberOfChannels, bufferSize) {
    this.output = new AudioletDestination(this, sampleRate, 
                                          numberOfChannels, bufferSize);
}

