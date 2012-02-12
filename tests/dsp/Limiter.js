load('../../../../audiotest.js/trunk/audiotest.js');
load('../../src/audiofile/audiofile.js');
load('../../src/audiolet/Audiolet.js');
load('../Environment.js');

function testLimiter() {
    var audiolet = new Audiolet();
    var square = new Square(audiolet);
    var gain = new Gain(audiolet, 2); // Make the square wave clip
    var limiter = new Limiter(audiolet);
    var recorder = new InputRecorder(audiolet, 1);

    square.connect(gain);
    gain.connect(limiter);
    limiter.connect(recorder);

    // Tick for a while so the envelope followers make it past the attack phase
    for (var i=0; i<81920; i++) {
        square.tick();
        gain.tick();
        limiter.tick();
        recorder.tick();
    }

    var buffer = recorder.buffers[0][0];
    Assert.assertAudibleValues(buffer);
    Assert.assertValuesInRange(buffer, -2, 2);

    // Check that we have limited the amplitude
    recorder.reset();
    for (var i=0; i<81920; i++) {
        square.tick();
        gain.tick();
        limiter.tick();
        recorder.tick();
    }

    var buffer = recorder.buffers[0][0];
    Assert.assertAudibleValues(buffer);
    Assert.assertValuesInRange(buffer, -1, 1);
}

test("Limiter", testLimiter);
