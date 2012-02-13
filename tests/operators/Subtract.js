load('../../../../audiotest.js/trunk/audiotest.js');
load('../../src/audiofile/audiofile.js');
load('../../src/audiolet/Audiolet.js');
load('../Environment.js');

function testSubtract() {
    var audiolet = new Audiolet();
    var sine = new Sine(audiolet);
    var subtract = new Subtract(audiolet, 1);
    var recorder = new InputRecorder(audiolet, 1);

    sine.connect(subtract);
    subtract.connect(recorder);

    for (var i=0; i<81920; i++) {
        sine.tick();
        subtract.tick();
        recorder.tick();
    }

    var buffer = recorder.buffers[0][0];
    Assert.assertContinuous(buffer);
    Assert.assertAudibleValues(buffer);
    Assert.assertValuesInRange(buffer, -2, 0);
}

test("Subtract", testSubtract);
