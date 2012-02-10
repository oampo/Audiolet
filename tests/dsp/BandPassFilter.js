load('../../../../audiotest.js/trunk/audiotest.js');
load('../../src/audiofile/audiofile.js');
load('../../src/audiolet/Audiolet.js');
load('../Environment.js');

function testBPF() {
    var audiolet = new Audiolet();
    var sine = new Sine(audiolet, 300);
    var bpf = new BandPassFilter(audiolet, 350);
    var recorder = new InputRecorder(audiolet, 1);

    sine.connect(bpf);
    bpf.connect(recorder);

    for (var i=0; i<81920; i++) {
        sine.tick();
        bpf.tick();
        recorder.tick();
    }

    var buffer = recorder.buffers[0][0];
    Assert.assertContinuous(buffer);
    Assert.assertAudibleValues(buffer);
    Assert.assertValuesInRange(buffer);
}

test("Band Pass Filter", testBPF);

// Make sure that the lows are getting filtered
function testFilteringLows() {
    var audiolet = new Audiolet();
    var sine = new Sine(audiolet, 300); // Should be filtered
    var bpf = new BandPassFilter(audiolet, 5000);
    var recorder = new InputRecorder(audiolet, 1);

    sine.connect(bpf);
    bpf.connect(recorder);

    for (var i=0; i<81920; i++) {
        sine.tick();
        bpf.tick();
        recorder.tick();
    }

    var buffer = recorder.buffers[0][0];
    Assert.assertContinuous(buffer);
    Assert.assertAudibleValues(buffer);
    Assert.assertValuesInRange(buffer, -0.1, 0.1); // Check for low amplitude
}

test("Is Filtering Lows", testFilteringLows);

// Make sure that the center frequencies aren't getting filtered
function testPassingCenter() {
    var audiolet = new Audiolet();
    var sine = new Sine(audiolet, 1000); // Shouldn't be filtered
    var bpf = new BandPassFilter(audiolet, 1000);
    var recorder = new InputRecorder(audiolet, 1);

    sine.connect(bpf);
    bpf.connect(recorder);

    for (var i=0; i<81920; i++) {
        sine.tick();
        bpf.tick();
        recorder.tick();

    }

    var buffer = recorder.buffers[0][0];
    Assert.assertAudibleValues(buffer);
    Assert.assertValuesReach(buffer); // Check for high amplitude
}

test("Is Passing Center", testPassingCenter);

// Make sure that the highs are getting filtered
function testFilteringHighs() {
    var audiolet = new Audiolet();
    var sine = new Sine(audiolet, 5000); // Should be filtered
    var bpf = new BandPassFilter(audiolet, 200);
    var recorder = new InputRecorder(audiolet, 1);

    sine.connect(bpf);
    bpf.connect(recorder);

    for (var i=0; i<81920; i++) {
        sine.tick();
        bpf.tick();
        recorder.tick();
    }

    var buffer = recorder.buffers[0][0];
    Assert.assertContinuous(buffer);
    Assert.assertAudibleValues(buffer);
    Assert.assertValuesInRange(buffer, -0.1, 0.1); // Check for low amplitude
}

test("Is Filtering Highs", testFilteringHighs);
