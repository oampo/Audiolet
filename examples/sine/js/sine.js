window.addEvent("domready", function() {
    var audiolet = new Audiolet(44100, 2, Math.pow(2, 13));
    var sine = new Sine(audiolet);
    sine.connect(audiolet.output);
});


