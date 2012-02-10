load('../../../../audiotest.js/trunk/audiotest.js');
load('../../src/audiofile/audiofile.js');
load('../../src/audiolet/Audiolet.js');
load('../Environment.js');

function testAPF() {
    var audiolet = new Audiolet();
    var sine = new Sine(audiolet, 300);
    var apf = new AllPassFilter(audiolet, 500);
    var recorder = new InputRecorder(audiolet, 1);

    sine.connect(apf);
    apf.connect(recorder);

    for (var i=0; i<81920; i++) {
        sine.tick();
        apf.tick();
        recorder.tick();
    }

    var buffer = recorder.buffers[0][0];
    Assert.assertContinuous(buffer);
    Assert.assertAudibleValues(buffer);
    Assert.assertValuesInRange(buffer);
}

test("All Pass Filter", testAPF);
