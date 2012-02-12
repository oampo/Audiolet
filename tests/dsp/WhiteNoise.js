load('../../../../audiotest.js/trunk/audiotest.js');
load('../../src/audiofile/audiofile.js');
load('../../src/audiolet/Audiolet.js');
load('../Environment.js');

function testWhiteNoise() {
    var audiolet = new Audiolet();
    var whiteNoise = new WhiteNoise(audiolet);
    var recorder = new InputRecorder(audiolet, 1);

    whiteNoise.connect(recorder);

    for (var i=0; i<81920; i++) {
        whiteNoise.tick();
        recorder.tick();
    }

    var buffer = recorder.buffers[0][0];
    Assert.assertAudibleValues(buffer);
    Assert.assertValuesInRange(buffer);
}

test("White Noise", testWhiteNoise);
