load('../../../../audiotest.js/trunk/audiotest.js');
load('../../src/audiofile/audiofile.js');
load('../../src/audiolet/Audiolet.js');
load('../Environment.js');

function testAmplitude() {
    var audiolet = new Audiolet();
    var square = new Square(audiolet, 300);
    var amplitude = new Amplitude(audiolet, 1, 1);
    var recorder = new InputRecorder(audiolet, 1);

    square.connect(amplitude);
    amplitude.connect(recorder);

    // Check that we move continuously from 0 to 1
    for (var i=0; i<81920; i++) {
        square.tick();
        amplitude.tick();
        recorder.tick();
    }

    var buffer = recorder.buffers[0][0];
    Assert.assertContinuous(buffer);
    Assert.assertAudibleValues(buffer);
    Assert.assertValuesInRange(buffer, 0, 1);

    // Check that the Amplitude has almost reached 1
    recorder.reset();
    for (var i=0; i<81920; i++) {
        square.tick();
        amplitude.tick();
        recorder.tick();
    }
    var buffer = recorder.buffers[0][0];
    Assert.assertValuesInRange(buffer, 0.99, 1);

    // Reduce amplitude to 0.5, and check that we move continuously from 1 to
    // 0.5
    recorder.reset();
    square.disconnect(amplitude);
    var mul = new Multiply(audiolet, 0.5);
    square.connect(mul);
    mul.connect(amplitude);

    for (var i=0; i<81920; i++) {
       square.tick();
       mul.tick();
       amplitude.tick();
       recorder.tick();
    }
    Assert.assertContinuous(buffer);
    Assert.assertAudibleValues(buffer);
    Assert.assertValuesInRange(buffer, 0.5, 1);

    // Check that the amplitude has almost reached 0.5
    recorder.reset();

    for (var i=0; i<81920; i++) {
        square.tick();
        mul.tick();
        amplitude.tick();
        recorder.tick();     
    }
    var buffer = recorder.buffers[0][0];
    Assert.assertValuesInRange(buffer, 0.5, 0.51);
};

test("Amplitude", testAmplitude);
