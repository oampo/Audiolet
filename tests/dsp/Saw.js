load('../../../../audiotest.js/trunk/audiotest.js');
load('../../src/audiofile/audiofile.js');
load('../../src/audiolet/Audiolet.js');
load('../Environment.js');

function testSaw() {
    var audiolet = new Audiolet();
    var saw = new Saw(audiolet);
    var recorder = new InputRecorder(audiolet, 1);

    saw.connect(recorder);

    for (var i=0; i<81920; i++) {
        saw.tick();
        recorder.tick();
    }

    var buffer = recorder.buffers[0][0];
    Assert.assertAudibleValues(buffer);
    Assert.assertValuesInRange(buffer);
}

test("Saw", testSaw);
