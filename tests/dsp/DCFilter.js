load('../../../../audiotest.js/trunk/audiotest.js');
load('../../src/audiofile/audiofile.js');
load('../../src/audiolet/Audiolet.js');
load('../Environment.js');

function testDCFilter() {
    var audiolet = new Audiolet();
    var sine = new Sine(audiolet);
    var add = new Add(audiolet, 1); // Adds a DC offset
    var dcFilter = new DCFilter(audiolet);
    var recorder = new InputRecorder(audiolet, 1);

    sine.connect(add);
    add.connect(dcFilter);
    dcFilter.connect(recorder);

    // Give the filter time to start filtering the offset
    for (var i=0; i<81920; i++) {
        sine.tick();
        add.tick();
        dcFilter.tick();
        recorder.tick();
    }

    var buffer = recorder.buffers[0][0];
    Assert.assertContinuous(buffer);
    Assert.assertAudibleValues(buffer);
    Assert.assertValuesInRange(buffer, -1, 2);

    // Most of the DC offset should now be filtered
    recorder.reset();
    for (var i=0; i<audiolet.device.sampleRate; i++) {
        sine.tick();
        add.tick();
        dcFilter.tick();
        recorder.tick();
    }

    var buffer = recorder.buffers[0][0];
    Assert.assertContinuous(buffer);
    Assert.assertAudibleValues(buffer);
    Assert.assertValuesInRange(buffer, -1, 1);
}

test("DC Filter", testDCFilter);
