var Audiolet = new Class({
    initialize: function(sampleRate, numberOfChannels, bufferSize) {
        this.sampleRate = sampleRate || 44100.0;
        this.numberOfChannels = numberOfChannels || 2;
        this.bufferSize = bufferSize || Math.pow(2, 14);
        
        this.output = new AudioletDestination(this);
        // Easy-access destination variables
        this.device = this.output.device;
        this.scheduler = this.output.scheduler;
    }
});

