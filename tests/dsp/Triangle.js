load('../../../../audiotest.js/trunk/audiotest.js');
load('../../src/audiofile/audiofile.js');
load('../../src/audiolet/Audiolet.js');
load('../Environment.js');

function testTriangle() {
    var audiolet = new Audiolet();
    var triangle = new Triangle(audiolet);
    var recorder = new InputRecorder(audiolet, 1);

    triangle.connect(recorder);

    for (var i=0; i<81920; i++) {
        triangle.tick();
        recorder.tick();
    }

    var buffer = recorder.buffers[0][0];
    Assert.assertContinuous(buffer);
    Assert.assertAudibleValues(buffer);
    Assert.assertValuesInRange(buffer);
}

test("Triangle", testTriangle);
