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

    for (var i=0; i<10; i++) {
        recorder.tick(8192, i);
    }

    var buffer = recorder.buffers[0];
    var data = buffer.getChannelData(0);
    Assert.assertContinuous(data);
    Assert.assertAudibleValues(data);
    Assert.assertValuesInRange(data);
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

    for (var i=0; i<10; i++) {
        recorder.tick(8192, i);
    }

    var buffer = recorder.buffers[0];
    var data = buffer.getChannelData(0);
    Assert.assertContinuous(data);
    Assert.assertAudibleValues(data);
    Assert.assertValuesInRange(data, -0.1, 0.1); // Check for low amplitude
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

    for (var i=0; i<10; i++) {
        recorder.tick(8192, i);
    }

    var buffer = recorder.buffers[0];
    var data = buffer.getChannelData(0);
    Assert.assertAudibleValues(data);
    Assert.assertValuesReach(data); // Check for high amplitude
}

test("Is Passing Lows", testPassingLows);

function testEmpty() {
    var audiolet = new Audiolet();
    var lpf = new LowPassFilter(audiolet);
    var node = new Introspector(audiolet, 1, 0);
    lpf.connect(node);

    node.tick(8192, 0);

    Assert.assertEquals(node.inputBuffers[0].isEmpty, true, "Buffer empty");
}

test("Empty input", testEmpty);
