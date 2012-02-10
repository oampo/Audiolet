load('../../../../audiotest.js/trunk/audiotest.js');
load('../../src/audiofile/audiofile.js');
load('../../src/audiolet/Audiolet.js');
load('../Environment.js');

function testSquare() {
    var audiolet = new Audiolet();
    var square = new Square(audiolet);
    var recorder = new InputRecorder(audiolet, 1);

    square.connect(recorder);

    for (var i=0; i<81920; i++) {
        square.tick();
        recorder.tick();
    }

    var buffer = recorder.buffers[0][0];
    Assert.assertAudibleValues(buffer);
    Assert.assertValuesInRange(buffer);
}

test("Square", testSquare);
