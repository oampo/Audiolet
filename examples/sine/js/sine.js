function playExample() {
    var audiolet = new Audiolet();
    var sine = new Sine(audiolet);
    sine.connect(audiolet.output);
};