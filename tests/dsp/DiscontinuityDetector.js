load('../../../../audiotest.js/trunk/audiotest.js');
load('../../src/audiofile/audiofile.js');
load('../../src/audiolet/Audiolet.js');
load('../Environment.js');

function testDiscontinuityDetector() {
    var detected = false
    var audiolet = new Audiolet();
    var source = new AudioletNode(audiolet, 0, 1);
    var dd = new DiscontinuityDetector(audiolet, 0.1, function() {
        detected = true;
    });

    source.connect(dd);
    
    // Continuous
    source.outputs[0].samples = [0];
    dd.tick();
    source.outputs[0].samples = [0.1];
    dd.tick();
    source.outputs[0].samples = [0.15];
    dd.tick();
    Assert.assertFalse(detected, "Continuous undetected");

    // Discontinuous
    source.outputs[0].samples = [0.35];
    dd.tick();
    Assert.assertTrue(detected, "Discontinuous detected");
}

test("Discontinuity Detector", testDiscontinuityDetector);
