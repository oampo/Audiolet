load('../../../../audiotest.js/trunk/audiotest.js');
load('../../src/audiofile/audiofile.js');
load('../../src/audiolet/Audiolet.js');
load('../Environment.js');

function testPan() {
    var audiolet = new Audiolet();
    var square = new Square(audiolet);
    var pan = new Pan(audiolet);

    square.connect(pan);

    // Check position 0, should be all left channel
    pan.pan.setValue(0);
    square.tick();
    pan.tick();

    Assert.assertEquals(pan.outputs[0].samples[0], 1);
    Assert.assertEquals(pan.outputs[0].samples[1], 0);

    // Check position 1, should be all right channel
    pan.pan.setValue(1);
    square.tick();
    pan.tick();

    Assert.assertClose(pan.outputs[0].samples[0], 0);
    Assert.assertEquals(pan.outputs[0].samples[1], 1);

    // Check position 0.5, should be centrally panned using equal power law
    pan.pan.setValue(0.5);
    square.tick();
    pan.tick();  

    Assert.assertEquals(pan.outputs[0].samples[0], Math.sqrt(2) / 2);
    Assert.assertEquals(pan.outputs[0].samples[0], Math.sqrt(2) / 2);
}

test("Pan", testPan);
