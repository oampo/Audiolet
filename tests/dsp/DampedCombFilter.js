load('../../../../audiotest.js/trunk/audiotest.js');
load('../../src/audiofile/audiofile.js');
load('../../src/audiolet/Audiolet.js');
load('../Environment.js');

function testDampedCombFilter() {
    var audiolet = new Audiolet();
    var sine = new Sine(audiolet);
    var combFilter = new DampedCombFilter(audiolet, 0.1, 0.1, 0.5, 0.05);
    var recorder = new InputRecorder(audiolet, 1);

    sine.connect(combFilter);
    combFilter.connect(recorder);

    for (var i=0; i<81920; i++) {
        sine.tick();
        combFilter.tick();
        recorder.tick();
    }

    var buffer = recorder.buffers[0][0];
    Assert.assertAudibleValues(buffer);
}

test("Damped Comb Filter", testDampedCombFilter);
