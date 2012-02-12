load('../../../../audiotest.js/trunk/audiotest.js');
load('../../src/audiofile/audiofile.js');
load('../../src/audiolet/Audiolet.js');
load('../Environment.js');

function testCrossFade() {
    var audiolet = new Audiolet();
    var square1 = new Square(audiolet);
    var square2 = new Square(audiolet);
    var mul = new Multiply(audiolet, 0.5);
    var cf = new CrossFade(audiolet);
    cf.position.setValue(0);

    square1.connect(cf);
    square2.connect(mul);
    mul.connect(cf, 0, 1);

    // Check position 0, should be all square1
    square1.tick();
    square2.tick();
    mul.tick();
    cf.tick();

    Assert.assertEquals(cf.outputs[0].samples[0], 1);

    // Check position 1, should be all square2
    cf.position.setValue(1);
    square1.tick();
    square2.tick();
    mul.tick();
    cf.tick();

    Assert.assertClose(cf.outputs[0].samples[0], 0.5);

    // Check position 0.5, should be mixed using equal power law
    cf.position.setValue(0.5);
    square1.tick();
    square2.tick();
    mul.tick();
    cf.tick();  

    Assert.assertEquals(cf.outputs[0].samples[0], (1 + 0.5) * Math.sqrt(2) / 2);
}

test("Cross Fade", testCrossFade);
