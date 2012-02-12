load('../../../../audiotest.js/trunk/audiotest.js');
load('../../src/audiofile/audiofile.js');
load('../../src/audiolet/Audiolet.js');
load('../Environment.js');

function testReverb() {
    var audiolet = new Audiolet();
    var sine = new Sine(audiolet);
    var reverb = new Reverb(audiolet);
    var recorder = new InputRecorder(audiolet, 1);

    sine.connect(reverb);
    reverb.connect(recorder);

    for (var i=0; i<81920; i++) {
        sine.tick();
        reverb.tick();
        recorder.tick();
    }

    var buffer = recorder.buffers[0][0];
    Assert.assertContinuous(buffer);
    Assert.assertAudibleValues(buffer);
    Assert.assertValuesInRange(buffer);
}

test("Reverb", testReverb);
