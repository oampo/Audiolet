// Example needs to be run from a server for XHR file loading to work
window.onload = playExample;
function playExample() {
    var AudioletApp = function() {
        this.audiolet = new Audiolet();
        // Amen break is 138 BPM
        this.audiolet.scheduler.setTempo(138);

        // Create an empty buffer
        this.amen = new AudioletBuffer(1, 0);
        // Load wav using synchronous XHR
        this.amen.load('audio/amen.wav', false);

        // Create buffer player
        this.player = new BufferPlayer(this.audiolet, this.amen, 1, 0, 1);
        // Create trigger to force breakbeat cuts
        this.restartTrigger = new TriggerControl(this.audiolet);

        // Connect it all up
        this.restartTrigger.connect(this.player, 0, 1);
        this.player.connect(this.audiolet.output);

        // Work through the four bars in order
        var barStartPosition = new PSequence([0, 0, 0, 0,
                                              1, 1, 1, 1,
                                              2, 2, 2, 2,
                                              3, 3, 3, 3],
                                             Infinity);
        // Rearrange the individual beats within a bar
        var positionInBar = new PChoose([new PSequence([0, 1, 2, 3]),
                                         new PSequence([0, 0, 0, 0]),
                                         new PSequence([0, 0, 2, 2]),
                                         new PSequence([0, 3, 2, 1])],
                                         Infinity);

        this.audiolet.scheduler.play([barStartPosition, positionInBar], 1,
            function(barStartPosition, positionInBar) {
                // Scale position 0->1
                var position = barStartPosition / 4 + positionInBar / 16;
                // Scale position 0->length
                position *= this.amen.length;
                this.player.startPosition.setValue(position);
                this.restartTrigger.trigger.setValue(1);
            }.bind(this)
        );
    }

    this.audioletApp = new AudioletApp();
};