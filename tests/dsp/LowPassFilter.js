load('../../../../audiotest.js/trunk/audiotest.js');
load('../../src/audiofile/audiofile.js');
load('../../src/audiolet/Audiolet.js');
load('../Environment.js');

function testLPF() {
    var audiolet = new Audiolet();
    var sine = new Sine(audiolet, 300);
    var lpf = new LowPassFilter(audiolet, 300);
    var recorder = new InputRecorder(audiolet, 1);

    sine.connect(lpf);
    lpf.connect(recorder);

    for (var i=0; i<81920; i++) {
        sine.tick();
        lpf.tick();
        recorder.tick();
    }

    var buffer = recorder.buffers[0][0];
    Assert.assertContinuous(buffer);
    Assert.assertAudibleValues(buffer);
    Assert.assertValuesInRange(buffer);
}

test("Low Pass Filter", testLPF);

// Make sure that the highs are getting filtered
function testFilteringHighs() {
    var audiolet = new Audiolet();
    var sine = new Sine(audiolet, 5000); // Should be filtered
    var lpf = new LowPassFilter(audiolet, 300);
    var recorder = new InputRecorder(audiolet, 1);

    sine.connect(lpf);
    lpf.connect(recorder);

    for (var i=0; i<81920; i++) {
        sine.tick();
        lpf.tick();
        recorder.tick();
    }

    var buffer = recorder.buffers[0][0];
    Assert.assertContinuous(buffer);
    Assert.assertAudibleValues(buffer);
    Assert.assertValuesInRange(buffer, -0.1, 0.1); // Check for low amplitude
}

test("Is Filtering Highs", testFilteringHighs);

// Make sure that the highs aren't getting filtered
function testPassingLows() {
    var audiolet = new Audiolet();
    var sine = new Sine(audiolet, 300); // Shouldn't be filtered
    var lpf = new LowPassFilter(audiolet, 5000);
    var recorder = new InputRecorder(audiolet, 1);

    sine.connect(lpf);
    lpf.connect(recorder);

    for (var i=0; i<81920; i++) {
        sine.tick();
        lpf.tick();
        recorder.tick();
    }

    var buffer = recorder.buffers[0][0];
    Assert.assertAudibleValues(buffer);
    Assert.assertValuesReach(buffer); // Check for high amplitude
}

test("Is Passing Lows", testPassingLows);

