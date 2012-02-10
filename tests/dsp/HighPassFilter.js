load('../../../../audiotest.js/trunk/audiotest.js');
load('../../src/audiofile/audiofile.js');
load('../../src/audiolet/Audiolet.js');
load('../Environment.js');

function testHPF() {
    var audiolet = new Audiolet();
    var sine = new Sine(audiolet, 300);
    var hpf = new HighPassFilter(audiolet, 300);
    var recorder = new InputRecorder(audiolet, 1);

    sine.connect(hpf);
    hpf.connect(recorder);

    for (var i=0; i<81920; i++) {
        sine.tick();
        hpf.tick();
        recorder.tick();
    }

    var buffer = recorder.buffers[0][0];
    Assert.assertContinuous(buffer);
    Assert.assertAudibleValues(buffer);
    Assert.assertValuesInRange(buffer);
}

test("High Pass Filter", testHPF);

// Make sure that the lows are getting filtered
function testFilteringLows() {
    var audiolet = new Audiolet();
    var sine = new Sine(audiolet, 300); // Should be filtered
    var hpf = new HighPassFilter(audiolet, 5000);
    var recorder = new InputRecorder(audiolet, 1);

    sine.connect(hpf);
    hpf.connect(recorder);

    for (var i=0; i<81920; i++) {
        sine.tick();
        hpf.tick();
        recorder.tick();
    }

    var buffer = recorder.buffers[0][0];
    Assert.assertContinuous(buffer);
    Assert.assertAudibleValues(buffer);
    Assert.assertValuesInRange(buffer, -0.1, 0.1); // Check for low amplitude
}

test("Is Filtering Lows", testFilteringLows);

// Make sure that the highs aren't getting filtered
function testPassingHighs() {
    var audiolet = new Audiolet();
    var sine = new Sine(audiolet, 5000); // Shouldn't be filtered
    var hpf = new HighPassFilter(audiolet, 300);
    var recorder = new InputRecorder(audiolet, 1);

    sine.connect(hpf);
    hpf.connect(recorder);

    for (var i=0; i<81920; i++) {
        sine.tick();
        hpf.tick();
        recorder.tick();
    }

    var buffer = recorder.buffers[0][0];
    Assert.assertAudibleValues(buffer);
    Assert.assertValuesReach(buffer); // Check for high amplitude
}

test("Is Passing Highs", testPassingHighs);
