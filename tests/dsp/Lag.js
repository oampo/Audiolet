load('../../../../audiotest.js/trunk/audiotest.js');
load('../../src/audiofile/audiofile.js');
load('../../src/audiolet/Audiolet.js');
load('../Environment.js');

function testLag() {
    var audiolet = new Audiolet();
    var lag = new Lag(audiolet, 5);
    var recorder = new InputRecorder(audiolet, 1);

    lag.connect(recorder);

    // Check that we move continuously from 5 to 0
    lag.value.setValue(0);
    for (var i=0; i<audiolet.device.sampleRate; i++) {
        lag.tick();
        recorder.tick();
    }

    var buffer = recorder.buffers[0][0];
    Assert.assertContinuous(buffer);
    Assert.assertAudibleValues(buffer);
    Assert.assertValuesInRange(buffer, 0, 5);

    // Check that the lag has almost reached 0
    recorder.reset();
    for (var i=0; i<audiolet.device.sampleRate; i++) {
        lag.tick();
        recorder.tick();
    }
    var buffer = recorder.buffers[0][0];
    Assert.assertValuesInRange(buffer, 0, 0.01);
};

test("Lag", testLag);
