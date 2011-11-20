function playExample() {
    var audiolet = new Audiolet();
    var sine = new WhiteNoise(audiolet);
    var filter = new LowPassFilter(audiolet, 200);
    sine.connect(filter);
    filter.connect(audiolet.output);
};