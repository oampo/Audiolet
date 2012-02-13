load('../../../../audiotest.js/trunk/audiotest.js');
load('../../src/audiofile/audiofile.js');
load('../../src/audiolet/Audiolet.js');
load('../Environment.js');

function testDivide() {
    var audiolet = new Audiolet();
    var sine = new Sine(audiolet);
    var divide = new Divide(audiolet, 2);
    var recorder = new InputRecorder(audiolet, 1);

    sine.connect(divide);
    divide.connect(recorder);

    for (var i=0; i<81920; i++) {
        sine.tick();
        divide.tick();
        recorder.tick();
    }

    var buffer = recorder.buffers[0][0];
    Assert.assertContinuous(buffer);
    Assert.assertAudibleValues(buffer);
    Assert.assertValuesInRange(buffer, -0.5, 0.5);
}

test("Divide", testDivide);
