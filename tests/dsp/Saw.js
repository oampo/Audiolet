load('../../../../audiotest.js/trunk/audiotest.js');
load('../../src/audiofile/audiofile.js');
load('../../src/audiolet/Audiolet.js');
load('../Environment.js');

function testSaw() {
    var audiolet = new Audiolet();
    var saw = new Saw(audiolet);
    var recorder = new InputRecorder(audiolet, 1);

    saw.connect(recorder);

    for (var i=0; i<10; i++) {
        recorder.tick(8192, i);
    }

    var buffer = recorder.buffers[0];
    var data = buffer.getChannelData(0);
    Assert.assertAudibleValues(data);
    Assert.assertValuesInRange(data);
}

test("Saw", testSaw);
