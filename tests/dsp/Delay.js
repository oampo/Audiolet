load('../../../../audiotest.js/trunk/audiotest.js');
load('../../src/audiofile/audiofile.js');
load('../../src/audiolet/Audiolet.js');
load('../Environment.js');

function testDelay() {
    var audiolet = new Audiolet();
    var sine = new Sine(audiolet);
    var delay = new Delay(audiolet, 1, 1);
    var recorder = new InputRecorder(audiolet, 1);

    sine.connect(delay);
    delay.connect(recorder);

    // Should output silence for the first second
    for (var i=0; i<audiolet.device.sampleRate; i++) {
        sine.tick();
        delay.tick();
        recorder.tick();
    }

    var buffer = recorder.buffers[0][0];
    Assert.assertAudibleValues(buffer);
    Assert.assertValuesInRange(buffer, 0, 0);

    // After the first second it should output the sine wave
    recorder.reset();
    for (var i=0; i<audiolet.device.sampleRate; i++) {
        sine.tick();
        delay.tick();
        recorder.tick();
    }

    var buffer = recorder.buffers[0][0];
    Assert.assertAudibleValues(buffer);
    Assert.assertValuesInRange(buffer);
    Assert.assertValuesReach(buffer, -0.9, 0.9);
    Assert.assertContinuous(buffer);
}

test("Delay", testDelay);
