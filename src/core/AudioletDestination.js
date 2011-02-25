/**
 * @depends AudioletGroup.js
 */

var AudioletDestination = new Class({
    Extends: AudioletGroup,
    initialize: function(audiolet, sampleRate, numberOfChannels, bufferSize) {
        AudioletGroup.prototype.initialize.apply(this, [audiolet, 1, 0]);

        this.device = new AudioletDevice(audiolet, sampleRate,
                                         numberOfChannels, bufferSize);
        audiolet.device = this.device; // Shortcut
        this.scheduler = new Scheduler(audiolet);
        audiolet.scheduler = this.scheduler; // Shortcut

        this.blockSizeLimiter = new BlockSizeLimiter(audiolet,
                                                     Math.pow(2, 12));
        audiolet.blockSizeLimiter = this.blockSizeLimiter; // Shortcut

        this.upMixer = new UpMixer(audiolet, this.device.numberOfChannels);

        this.inputs[0].connect(this.blockSizeLimiter);
        this.blockSizeLimiter.connect(this.scheduler);
        this.scheduler.connect(this.upMixer);
        this.upMixer.connect(this.device);
    }
});
