load('../../../../audiotest.js/trunk/audiotest.js');
load('../../src/audiofile/audiofile.js');
load('../../src/audiolet/Audiolet.js');
load('../Environment.js');

function testBitCrusher() {
    var audiolet = new Audiolet();
    var sine = new Sine(audiolet);
    var bitCrusher = new BitCrusher(audiolet, 8);
    var recorder = new InputRecorder(audiolet, 1);

    sine.connect(bitCrusher);
    bitCrusher.connect(recorder);

    for (var i=0; i<81920; i++) {
        sine.tick();
        bitCrusher.tick();
        recorder.tick();
    }

    var buffer = recorder.buffers[0][0];
    Assert.assertAudibleValues(buffer);
    Assert.assertValuesInRange(buffer);
}

test("Bit Crusher", testBitCrusher);
