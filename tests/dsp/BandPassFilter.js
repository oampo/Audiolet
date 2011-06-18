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

    for (var i=0; i<10; i++) {
        recorder.tick(8192, i);
    }

    var buffer = recorder.buffers[0];
    var data = buffer.getChannelData(0);
    Assert.assertContinuous(data);
    Assert.assertAudibleValues(data);
    Assert.assertValuesInRange(data);
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

// Make sure that the center frequencies aren't getting filtered
function testPassingCenter() {
    var audiolet = new Audiolet();
    var sine = new Sine(audiolet, 1000); // Shouldn't be filtered
    var bpf = new BandPassFilter(audiolet, 1000);
    var recorder = new InputRecorder(audiolet, 1);

    sine.connect(bpf);
    bpf.connect(recorder);

    for (var i=0; i<10; i++) {
        recorder.tick(8192, i);
    }

    var buffer = recorder.buffers[0];
    var data = buffer.getChannelData(0);
    Assert.assertAudibleValues(data);
    Assert.assertValuesReach(data); // Check for high amplitude
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

function testEmpty() {
    var audiolet = new Audiolet();
    var bpf = new BandPassFilter(audiolet);
    var node = new Introspector(audiolet, 1, 0);
    bpf.connect(node);

    node.tick(8192, 0);

    Assert.assertEquals(node.inputBuffers[0].isEmpty, true, "Buffer empty");
}

test("Empty input", testEmpty);
