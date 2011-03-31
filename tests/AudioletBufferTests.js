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

test("Initialization", testInit);

function testLazyResizeMoreSamples() {
    var buffer = new AudioletBuffer(1, 0);
    buffer.resize(1, 5, true);

    Assert.assertEquals(buffer.numberOfChannels, 1, "Recorded channels");
    Assert.assertEquals(buffer.length, 5, "Recorded length");
    Assert.assertEquals(buffer.numberOfChannels, buffer.channels.length,
                        "Actual channels");
    Assert.assertEquals(buffer.length, buffer.channels[0].length,
                        "Actual length");
}

test("Lazy resize, increasing length", testLazyResizeMoreSamples);

function testLazyResizeLessSamples() {
    var buffer = new AudioletBuffer(1, 10);
    buffer.resize(1, 5, true);

    Assert.assertEquals(buffer.numberOfChannels, 1, "Recorded channels");
    Assert.assertEquals(buffer.length, 5, "Recorded length");
    Assert.assertEquals(buffer.numberOfChannels, buffer.channels.length,
                        "Actual channels");
    Assert.assertEquals(buffer.length, buffer.channels[0].length,
                        "Actual length");
}

test("Lazy resize, decreasing length", testLazyResizeLessSamples);

function testLazyResizeMoreChannels() {
    var buffer = new AudioletBuffer(1, 0);
    buffer.resize(2, 0, true);

    Assert.assertEquals(buffer.numberOfChannels, 2, "Recorded channels");
    Assert.assertEquals(buffer.length, 0, "Recorded length");
    Assert.assertEquals(buffer.numberOfChannels, buffer.channels.length,
                        "Actual channels");
    Assert.assertEquals(buffer.length, buffer.channels[0].length,
                        "Actual length");
}

test("Lazy resize, increasing channels", testLazyResizeMoreChannels);

function testLazyResizeLessChannels() {
    var buffer = new AudioletBuffer(2, 0);
    buffer.resize(1, 0, true);

    Assert.assertEquals(buffer.numberOfChannels, 1, "Recorded channels");
    Assert.assertEquals(buffer.length, 0, "Recorded length");
    Assert.assertEquals(buffer.numberOfChannels, buffer.channels.length,
                        "Actual channels");
    Assert.assertEquals(buffer.length, buffer.channels[0].length,
                        "Actual length");
}

test("Lazy resize, decreasing channels", testLazyResizeLessChannels);

function testResizeMoreSamples() {
    var buffer = new AudioletBuffer(1, 5);
    buffer.channels[0][0] = 1;
    buffer.channels[0][1] = 2;
    buffer.channels[0][2] = 3;
    buffer.channels[0][3] = 5;
    buffer.channels[0][4] = 8;

    buffer.resize(1, 8, false, 2);
    Assert.assertEquals(buffer.numberOfChannels, 1, "Recorded channels");
    Assert.assertEquals(buffer.length, 8, "Recorded length");
    Assert.assertEquals(buffer.numberOfChannels, buffer.channels.length,
                        "Actual channels");
    Assert.assertEquals(buffer.length, buffer.channels[0].length,
                        "Actual length");
    // Blank space before
    Assert.assertEquals(buffer.channels[0][1], 0, "Start value");
    // Values moved by offset
    Assert.assertEquals(buffer.channels[0][2], 1, "Copied value 1");
    Assert.assertEquals(buffer.channels[0][4], 3, "Copied value 2");
    Assert.assertEquals(buffer.channels[0][6], 8, "Copied value 3");
    // Blank space after
    Assert.assertEquals(buffer.channels[0][7], 0, "End value");
}

test("Resize, increasing samples", testResizeMoreSamples);

function testResizeLessSamples() {
    var buffer = new AudioletBuffer(1, 5);
    buffer.channels[0][0] = 1;
    buffer.channels[0][1] = 2;
    buffer.channels[0][2] = 3;
    buffer.channels[0][3] = 5;
    buffer.channels[0][4] = 8;

    buffer.resize(1, 3, false, 1);
    Assert.assertEquals(buffer.numberOfChannels, 1, "Recorded channels");
    Assert.assertEquals(buffer.length, 3, "Recorded length");
    Assert.assertEquals(buffer.numberOfChannels, buffer.channels.length,
                        "Actual channels");
    Assert.assertEquals(buffer.length, buffer.channels[0].length,
                        "Actual length");
    // Values start at offset
    Assert.assertEquals(buffer.channels[0][0], 2);
    Assert.assertEquals(buffer.channels[0][1], 3);
    Assert.assertEquals(buffer.channels[0][2], 5);
}

test("Resize, decreasing samples", testResizeLessSamples);

function testResizeMoreChannels() {
    var buffer = new AudioletBuffer(1, 5);
    buffer.channels[0][0] = 1;
    buffer.channels[0][1] = 2;
    buffer.channels[0][2] = 3;
    buffer.channels[0][3] = 5;
    buffer.channels[0][4] = 8;

    buffer.resize(2, 3, false, 1);
    Assert.assertEquals(buffer.numberOfChannels, 2, "Recorded channels");
    Assert.assertEquals(buffer.length, 3, "Recorded length");
    Assert.assertEquals(buffer.numberOfChannels, buffer.channels.length,
                        "Actual channels");
    Assert.assertEquals(buffer.length, buffer.channels[0].length,
                        "Actual length");
    // Channel 1 - Values start at offset
    Assert.assertEquals(buffer.channels[0][0], 2);
    Assert.assertEquals(buffer.channels[0][1], 3);
    Assert.assertEquals(buffer.channels[0][2], 5);

    // Channels 2 - Empty
    Assert.assertEquals(buffer.channels[1][0], 0);
    Assert.assertEquals(buffer.channels[1][1], 0);
    Assert.assertEquals(buffer.channels[1][2], 0);
}

test("Resize, increasing channels", testResizeMoreChannels);

function testResizeLessChannels() {
    var buffer = new AudioletBuffer(2, 5);
    buffer.channels[0][0] = 1;
    buffer.channels[0][1] = 2;
    buffer.channels[0][2] = 3;
    buffer.channels[0][3] = 5;
    buffer.channels[0][4] = 8;
    buffer.channels[1][0] = 13;
    buffer.channels[1][1] = 21;
    buffer.channels[1][2] = 34;
    buffer.channels[1][3] = 55;
    buffer.channels[1][4] = 89;

    buffer.resize(1, 3, false, 1);
    Assert.assertEquals(buffer.numberOfChannels, 1, "Recorded channels");
    Assert.assertEquals(buffer.length, 3, "Recorded length");
    Assert.assertEquals(buffer.numberOfChannels, buffer.channels.length,
                        "Actual channels");
    Assert.assertEquals(buffer.length, buffer.channels[0].length,
                        "Actual length");
    // Channel 1 - Values start at offset
    Assert.assertEquals(buffer.channels[0][0], 2);
    Assert.assertEquals(buffer.channels[0][1], 3);
    Assert.assertEquals(buffer.channels[0][2], 5);
}

test("Resize, decreasing channels", testResizeLessChannels);
