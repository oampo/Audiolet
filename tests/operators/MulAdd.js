load('../../../../audiotest.js/trunk/audiotest.js');
load('../../src/audiofile/audiofile.js');
load('../../src/audiolet/Audiolet.js');
load('../Environment.js');

function testMulAdd() {
    var audiolet = new Audiolet();
    var sine = new Sine(audiolet);
    var mulAdd = new MulAdd(audiolet, 0.5, 0.5);
    var recorder = new InputRecorder(audiolet, 1);

    sine.connect(mulAdd);
    mulAdd.connect(recorder);

    for (var i=0; i<81920; i++) {
        sine.tick();
        mulAdd.tick();
        recorder.tick();
    }

    var buffer = recorder.buffers[0][0];
    Assert.assertContinuous(buffer);
    Assert.assertAudibleValues(buffer);
    Assert.assertValuesInRange(buffer, 0, 1);
}

test("MulAdd", testMulAdd);
