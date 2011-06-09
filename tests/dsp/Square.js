load('../../../../audiotest.js/trunk/audiotest.js');
load('../../src/audiofile/audiofile.js');
load('../../src/audiolet/Audiolet.js');
load('../Environment.js');

function testSquare() {
    var audiolet = new Audiolet();
    var square = new Square(audiolet);
    var recorder = new InputRecorder(audiolet, 1);

    square.connect(recorder);

    for (var i=0; i<10; i++) {
        recorder.tick(8192, i);
    }

    var buffer = recorder.buffers[0];
    var data = buffer.getChannelData(0);
    Assert.assertAudibleValues(data);
    Assert.assertValuesInRange(data);
}

test("Square", testSquare);
