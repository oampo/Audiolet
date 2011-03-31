load('../../../audiotest.js/trunk/audiotest.js');
load('mootools-core-1.3.1.js');
load('../src/audiofile/audiofile.js');
load('../src/audiolet/Audiolet.js');

function testInit() {
    var buffer = new AudioletBuffer(1, 0);
    Assert.assertEquals(buffer.numberOfChannels, 1, "Recorded channels");
    Assert.assertEquals(buffer.length, 0, "Recorded length");
    Assert.assertEquals(buffer.numberOfChannels, buffer.channels.length,
                        "Actual channels");
    Assert.assertEquals(buffer.length, buffer.channels[0].length,
                        "Actual length");
}

test("Initialization", testInit, 200);


