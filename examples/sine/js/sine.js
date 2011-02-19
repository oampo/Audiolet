window.addEvent("domready", function() {
    var audiolet = new Audiolet(44100, 2, Math.pow(2, 13));
    var sine = new Sine(audiolet);
    var pan = new Pan(audiolet);
    sine.connect(pan);
    pan.connect(audiolet.output);
});


