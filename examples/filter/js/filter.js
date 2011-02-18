window.addEvent("domready", function() {
    var audiolet = new Audiolet(44100, 2, Math.pow(2, 13));
    var sine = new WhiteNoise(audiolet);
    var filter = new LowPassFilter(audiolet, 200);
    var pan = new Pan(audiolet);
    sine.connect(filter);
    filter.connect(pan);
    pan.connect(audiolet.output);
});


