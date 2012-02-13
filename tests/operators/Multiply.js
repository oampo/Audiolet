load('../../../../audiotest.js/trunk/audiotest.js');
load('../../src/audiofile/audiofile.js');
load('../../src/audiolet/Audiolet.js');
load('../Environment.js');

function testMultiply() {
    var audiolet = new Audiolet();
    var sine = new Sine(audiolet);
    var multiply = new Multiply(audiolet, 2);
    var recorder = new InputRecorder(audiolet, 1);

    sine.connect(multiply);
    multiply.connect(recorder);

    for (var i=0; i<81920; i++) {
        sine.tick();
        multiply.tick();
        recorder.tick();
    }

    var buffer = recorder.buffers[0][0];
    Assert.assertContinuous(buffer, 0.2);
    Assert.assertAudibleValues(buffer);
    Assert.assertValuesInRange(buffer, -2, 2);
    Assert.assertValuesReach(buffer, -1.9, 1.9);
}

test("Multiply", testMultiply);
