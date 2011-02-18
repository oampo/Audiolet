/**
 * @depends AudioletGroup.js
 */

var AudioletDestination = new Class({
    Extends: AudioletGroup,
    initialize: function(audiolet) {
        AudioletGroup.prototype.initialize.apply(this, [audiolet, 1, 0]);

        this.device = new AudioletDevice(audiolet);
        this.scheduler = new Scheduler(audiolet);

        this.inputs[0].connect(this.scheduler);
        this.scheduler.connect(this.device);
    }
});
