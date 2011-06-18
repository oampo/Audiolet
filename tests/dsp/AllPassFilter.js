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

    for (var i=0; i<10; i++) {
        recorder.tick(8192, i);
    }

    var buffer = recorder.buffers[0];
    var data = buffer.getChannelData(0);
    Assert.assertContinuous(data);
    Assert.assertAudibleValues(data);
    Assert.assertValuesInRange(data);
}

test("All Pass Filter", testAPF);

function testEmpty() {
    var audiolet = new Audiolet();
    var apf = new AllPassFilter(audiolet);
    var node = new Introspector(audiolet, 1, 0);
    apf.connect(node);

    node.tick(8192, 0);

    Assert.assertEquals(node.inputBuffers[0].isEmpty, true, "Buffer empty");
}

test("Empty input", testEmpty);
