load('../../../../audiotest.js/trunk/audiotest.js');
load('../../src/audiofile/audiofile.js');
load('../../src/audiolet/Audiolet.js');
load('../Environment.js');

function testBadValueDetector() {
    var detected = false
    var audiolet = new Audiolet();
    var source = new AudioletNode(audiolet, 0, 1);
    var bvd = new BadValueDetector(audiolet, function() {
        detected = true;
    });

    source.connect(bvd);
    
    // Null
    source.outputs[0].samples = [null];
    bvd.tick();
    Assert.assertTrue(detected, "Null detected");
    
    // NaN
    detected = false;
    source.outputs[0].samples = [NaN];
    bvd.tick();
    Assert.assertTrue(detected, "NaN detected");

    // Undefined
    detected = false;
    source.outputs[0].samples = [undefined];
    bvd.tick();
    Assert.assertTrue(detected, "Undefined detected");

    // Infinity
    detected = false;
    source.outputs[0].samples = [Infinity];
    bvd.tick();
    Assert.assertTrue(detected, "Undefined detected");

    // -Infinity
    detected = false;
    source.outputs[0].samples = [-Infinity];
    bvd.tick();
    Assert.assertTrue(detected, "Undefined detected");

    // Pass values
    detected = false;
    source.outputs[0].samples = [0.7];
    bvd.tick();
    Assert.assertFalse(detected, "Values undetected");
}

test("Bad Value Detector", testBadValueDetector);
