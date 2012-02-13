load('../../../../audiotest.js/trunk/audiotest.js');
load('../../src/audiofile/audiofile.js');
load('../../src/audiolet/Audiolet.js');
load('../Environment.js');

function testModulo() {
    var audiolet = new Audiolet();
    var sine = new Sine(audiolet);
    var modulo = new Modulo(audiolet, 0.1);
    var recorder = new InputRecorder(audiolet, 1);

    sine.connect(modulo);
    modulo.connect(recorder);

    for (var i=0; i<81920; i++) {
        sine.tick();
        modulo.tick();
        recorder.tick();
    }

    var buffer = recorder.buffers[0][0];
    Assert.assertContinuous(buffer);
    Assert.assertAudibleValues(buffer);
    Assert.assertValuesInRange(buffer, -0.1, 0.1);
}

test("Modulo", testModulo);
