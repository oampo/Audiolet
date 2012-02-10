load('../../../../audiotest.js/trunk/audiotest.js');
load('../../src/audiofile/audiofile.js');
load('../../src/audiolet/Audiolet.js');
load('../Environment.js');

function testBRF() {
    var audiolet = new Audiolet();
    var sine = new Sine(audiolet, 300);
    var brf = new BandRejectFilter(audiolet, 300);
    var recorder = new InputRecorder(audiolet, 1);

    sine.connect(brf);
    brf.connect(recorder);

    for (var i=0; i<81920; i++) {
        sine.tick();
        brf.tick();
        recorder.tick();
    }

    var buffer = recorder.buffers[0][0];
    Assert.assertContinuous(buffer);
    Assert.assertAudibleValues(buffer);
    Assert.assertValuesInRange(buffer);
}

test("Band Reject Filter", testBRF);

// Make sure that the lows are getting filtered
// Make sure that the lows aren't getting filtered
function testPassingLows() {
    var audiolet = new Audiolet();
    var sine = new Sine(audiolet, 300); // Shouldn't be filtered
    var brf = new BandRejectFilter(audiolet, 5000);
    var recorder = new InputRecorder(audiolet, 1);

    sine.connect(brf);
    brf.connect(recorder);

    for (var i=0; i<81920; i++) {
        sine.tick();
        brf.tick();
        recorder.tick();
    }

    var buffer = recorder.buffers[0][0];
    Assert.assertAudibleValues(buffer);
    Assert.assertValuesReach(buffer); // Check for high amplitude
}

test("Is Passing Lows", testPassingLows);

// Make sure that the center frequencies are getting filtered
function testFilteringCenter() {
    var audiolet = new Audiolet();
    var sine = new Sine(audiolet, 300); // Should be filtered
    var brf = new BandRejectFilter(audiolet, 300);
    var recorder = new InputRecorder(audiolet, 1);

    sine.connect(brf);
    brf.connect(recorder);

    for (var i=0; i<81920; i++) {
        sine.tick();
        brf.tick();
        recorder.tick();
    }

    var buffer = recorder.buffers[0][0];
    Assert.assertContinuous(buffer);
    Assert.assertAudibleValues(buffer);
    Assert.assertValuesInRange(buffer, -0.5, 0.5); // Check for low amplitude
}

test("Is Filtering Center", testFilteringCenter);

// Make sure that the lows aren't getting filtered
function testPassingHighs() {
    var audiolet = new Audiolet();
    var sine = new Sine(audiolet, 5000); // Shouldn't be filtered
    var brf = new BandRejectFilter(audiolet, 300);
    var recorder = new InputRecorder(audiolet, 1);

    sine.connect(brf);
    brf.connect(recorder);

    for (var i=0; i<81920; i++) {
        sine.tick();
        brf.tick();
        recorder.tick();
    }

    var buffer = recorder.buffers[0][0];
    Assert.assertAudibleValues(buffer);
    Assert.assertValuesReach(buffer); // Check for high amplitude
}

test("Is Passing Highs", testPassingHighs);

