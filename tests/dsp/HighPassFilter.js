load('../../../../audiotest.js/trunk/audiotest.js');
load('../mootools-core-1.3.1.js');
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

    for (var i=0; i<10; i++) {
        recorder.tick(8192, i);
    }

    var buffer = recorder.buffers[0];
    var data = buffer.getChannelData(0);
    Assert.assertContinuous(data);
    Assert.assertAudibleValues(data);
    Assert.assertValuesInRange(data);
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

    for (var i=0; i<10; i++) {
        recorder.tick(8192, i);
    }

    var buffer = recorder.buffers[0];
    var data = buffer.getChannelData(0);
    Assert.assertContinuous(data);
    Assert.assertAudibleValues(data);
    Assert.assertValuesInRange(data, -0.1, 0.1); // Check for low amplitude
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

    for (var i=0; i<10; i++) {
        recorder.tick(8192, i);
    }

    var buffer = recorder.buffers[0];
    var data = buffer.getChannelData(0);
    Assert.assertAudibleValues(data);
    Assert.assertValuesReach(data); // Check for high amplitude
}

test("Is Passing Highs", testPassingHighs);
