load('../../../../audiotest.js/trunk/audiotest.js');
load('../../src/audiofile/audiofile.js');
load('../../src/audiolet/Audiolet.js');

function testInit() {
    var buffer = new AudioletBuffer(2, 2);
    Assert.assertEquals(buffer.numberOfChannels, 2, "Recorded channels");
    Assert.assertEquals(buffer.length, 2, "Recorded length");
    Assert.assertEquals(buffer.numberOfChannels, buffer.channels.length,
                        "Actual channels");
    Assert.assertEquals(buffer.length, buffer.channels[0].length,
                        "Actual length");
}

test("Initialization", testInit);

function testSet() {
    var buffer1 = new AudioletBuffer(2, 3);
    var buffer2 = new AudioletBuffer(2, 3);
    buffer1.channels[0][0] = 1;
    buffer1.channels[0][1] = 2;
    buffer1.channels[0][2] = 3;
    buffer1.channels[1][0] = 5;
    buffer1.channels[1][1] = 8;
    buffer1.channels[1][2] = 13;

    buffer2.set(buffer1);
    Assert.assertEquals(buffer2.channels[0][0], 1, "Start value");
    Assert.assertEquals(buffer2.channels[1][1], 8, "Middle value");
    Assert.assertEquals(buffer2.channels[1][2], 13, "End value");
}

test("Set", testSet);

function testSetSection() {
    var buffer1 = new AudioletBuffer(2, 4);
    var buffer2 = new AudioletBuffer(2, 5);
    buffer1.channels[0][0] = 1;
    buffer1.channels[0][1] = 2;
    buffer1.channels[0][2] = 3;
    buffer1.channels[0][3] = 5;
    buffer1.channels[1][0] = 8;
    buffer1.channels[1][1] = 13;
    buffer1.channels[1][2] = 21;
    buffer1.channels[1][3] = 34;

    buffer2.setSection(buffer1, 2, 1, 2);
    // Zero at the start
    Assert.assertEquals(buffer2.channels[0][0], 0, "Start value");
    // Value from each channel
    Assert.assertEquals(buffer2.channels[0][2], 2, "Copied value 1");
    Assert.assertEquals(buffer2.channels[1][3], 21, "Copied value 2");
    // Zero at the end
    Assert.assertEquals(buffer2.channels[0][4], 0, "End value"); 
}

test("Set Section", testSetSection);

function testAdd() {
    var buffer1 = new AudioletBuffer(2, 2);
    var buffer2 = new AudioletBuffer(2, 2);
    buffer1.channels[0][0] = 1;
    buffer1.channels[0][1] = 2;
    buffer1.channels[1][0] = 3;
    buffer1.channels[1][1] = 5;
    buffer2.channels[0][0] = 8;
    buffer2.channels[0][1] = 13;
    buffer2.channels[1][0] = 21;
    buffer2.channels[1][1] = 34;

    buffer2.add(buffer1);
    // Value from each channel
    Assert.assertEquals(buffer2.channels[0][0], 9, "Value 1");
    Assert.assertEquals(buffer2.channels[1][1], 39, "Value 2");
}

test("Add", testAdd);

function testAddSection() {
    var buffer1 = new AudioletBuffer(2, 4);
    var buffer2 = new AudioletBuffer(2, 4);
    buffer1.channels[0][0] = 1;
    buffer1.channels[0][1] = 2;
    buffer1.channels[0][2] = 3;
    buffer1.channels[0][3] = 5;
    buffer1.channels[1][0] = 8;
    buffer1.channels[1][1] = 13;
    buffer1.channels[1][2] = 21;
    buffer1.channels[1][3] = 34;
    buffer2.channels[0][0] = 55;
    buffer2.channels[0][1] = 89;
    buffer2.channels[0][2] = 1;
    buffer2.channels[0][3] = 2;
    buffer2.channels[1][0] = 3;
    buffer2.channels[1][1] = 5;
    buffer2.channels[1][2] = 8;
    buffer2.channels[1][3] = 13;

    buffer2.addSection(buffer1, 2, 2, 1);
    // Value before adding section
    Assert.assertEquals(buffer2.channels[0][0], 55, "Start Value");
    // Value from each channel
    Assert.assertEquals(buffer2.channels[0][1], 92, "Added Value 1");
    Assert.assertEquals(buffer2.channels[1][2], 42, "Added Value 2");
    // Value after adding section
    Assert.assertEquals(buffer2.channels[1][3], 13, "Start Value");
}

test("Add Section", testAddSection);


function testLazyResizeMoreSamples() {
    var buffer = new AudioletBuffer(2, 0);
    buffer.resize(2, 5, true);

    Assert.assertEquals(buffer.numberOfChannels, 2, "Recorded channels");
    Assert.assertEquals(buffer.length, 5, "Recorded length");
    Assert.assertEquals(buffer.numberOfChannels, buffer.channels.length,
                        "Actual channels");
    Assert.assertEquals(buffer.length, buffer.channels[0].length,
                        "Actual length 1");
    Assert.assertEquals(buffer.length, buffer.channels[1].length,
                        "Actual length 2");
}

test("Lazy resize, increasing length", testLazyResizeMoreSamples);

function testLazyResizeLessSamples() {
    var buffer = new AudioletBuffer(2, 10);
    buffer.resize(2, 5, true);

    Assert.assertEquals(buffer.numberOfChannels, 2, "Recorded channels");
    Assert.assertEquals(buffer.length, 5, "Recorded length");
    Assert.assertEquals(buffer.numberOfChannels, buffer.channels.length,
                        "Actual channels");
    Assert.assertEquals(buffer.length, buffer.channels[0].length,
                        "Actual length");
    Assert.assertEquals(buffer.length, buffer.channels[1].length,
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

function testPush() {
    var buffer1 = new AudioletBuffer(2, 2);
    var buffer2 = new AudioletBuffer(2, 2);
    buffer1.channels[0][0] = 1;
    buffer1.channels[0][1] = 2;
    buffer1.channels[1][0] = 3;
    buffer1.channels[1][1] = 5;
    buffer2.channels[0][0] = 8;
    buffer2.channels[0][1] = 13;
    buffer2.channels[1][0] = 21;
    buffer2.channels[1][1] = 34;

    buffer2.push(buffer1);
    Assert.assertEquals(buffer2.numberOfChannels, 2, "Recorded channels");
    Assert.assertEquals(buffer2.length, 4, "Recorded length");
    Assert.assertEquals(buffer2.numberOfChannels, buffer2.channels.length,
                        "Actual channels");
    Assert.assertEquals(buffer2.length, buffer2.channels[0].length,
                        "Actual length");

    // Before value from each channel
    Assert.assertEquals(buffer2.channels[0][0], 8, "Before Value 1");
    Assert.assertEquals(buffer2.channels[1][1], 34, "Before Value 2");
    // After value from each channel
    Assert.assertEquals(buffer2.channels[0][3], 2, "After Value 1");
    Assert.assertEquals(buffer2.channels[1][2], 3, "After Value 2");
}

test("Push", testPush);

function testPop() {
    var buffer1 = new AudioletBuffer(2, 2);
    var buffer2 = new AudioletBuffer(2, 1);
    buffer1.channels[0][0] = 1;
    buffer1.channels[0][1] = 2;
    buffer1.channels[1][0] = 3;
    buffer1.channels[1][1] = 5;
    buffer1.pop(buffer2);


    Assert.assertEquals(buffer1.numberOfChannels, 2, "Recorded channels");
    Assert.assertEquals(buffer1.length, 1, "Recorded length");
    Assert.assertEquals(buffer1.numberOfChannels, buffer1.channels.length,
                        "Actual channels");
    Assert.assertEquals(buffer1.length, buffer1.channels[0].length,
                        "Actual length");

    // Value in buffer 1 from each channel
    Assert.assertEquals(buffer1.channels[0][0], 1, "Before Value 1");
    Assert.assertEquals(buffer1.channels[1][0], 3, "Before Value 2");
    // Value in buffer 2 from each channel
    Assert.assertEquals(buffer2.channels[0][0], 2, "After Value 1");
    Assert.assertEquals(buffer2.channels[1][0], 5, "After Value 2");

}

test("Pop", testPop);

function testUnshift() {
    var buffer1 = new AudioletBuffer(2, 2);
    var buffer2 = new AudioletBuffer(2, 2);
    buffer1.channels[0][0] = 1;
    buffer1.channels[0][1] = 2;
    buffer1.channels[1][0] = 3;
    buffer1.channels[1][1] = 5;
    buffer2.channels[0][0] = 8;
    buffer2.channels[0][1] = 13;
    buffer2.channels[1][0] = 21;
    buffer2.channels[1][1] = 34;

    buffer2.unshift(buffer1);

    Assert.assertEquals(buffer2.numberOfChannels, 2, "Recorded channels");
    Assert.assertEquals(buffer2.length, 4, "Recorded length");
    Assert.assertEquals(buffer2.numberOfChannels, buffer2.channels.length,
                        "Actual channels");
    Assert.assertEquals(buffer2.length, buffer2.channels[0].length,
                        "Actual length");

    // Before value from each channel
    Assert.assertEquals(buffer2.channels[0][2], 8, "Before Value 1");
    Assert.assertEquals(buffer2.channels[1][3], 34, "Before Value 2");
    // After value from each channel
    Assert.assertEquals(buffer2.channels[0][1], 2, "After Value 1");
    Assert.assertEquals(buffer2.channels[1][0], 3, "After Value 2");
}

test("Unshift", testUnshift);


function testShift() {
    var buffer1 = new AudioletBuffer(2, 2);
    var buffer2 = new AudioletBuffer(2, 1);
    buffer1.channels[0][0] = 1;
    buffer1.channels[0][1] = 2;
    buffer1.channels[1][0] = 3;
    buffer1.channels[1][1] = 5;
    buffer1.shift(buffer2);


    Assert.assertEquals(buffer1.numberOfChannels, 2, "Recorded channels");
    Assert.assertEquals(buffer1.length, 1, "Recorded length");
    Assert.assertEquals(buffer1.numberOfChannels, buffer1.channels.length,
                        "Actual channels");
    Assert.assertEquals(buffer1.length, buffer1.channels[0].length,
                        "Actual length");

    // Value in buffer 1 from each channel
    Assert.assertEquals(buffer1.channels[0][0], 2, "Before Value 1");
    Assert.assertEquals(buffer1.channels[1][0], 5, "Before Value 2");
    // Value in buffer 2 from each channel
    Assert.assertEquals(buffer2.channels[0][0], 1, "After Value 1");
    Assert.assertEquals(buffer2.channels[1][0], 3, "After Value 2");
}

test("Shift", testShift);

function testInterleaved() {
    var buffer = new AudioletBuffer(2, 2);
    buffer.channels[0][0] = 1;
    buffer.channels[0][1] = 2;
    buffer.channels[1][0] = 3;
    buffer.channels[1][1] = 5;

    var interleaved = buffer.interleaved();
    Assert.assertEquals(interleaved.length, 4, "Length");
    Assert.assertEquals(interleaved[0], 1, "Value 1");
    Assert.assertEquals(interleaved[1], 3, "Value 2");
    Assert.assertEquals(interleaved[2], 2, "Value 3");
    Assert.assertEquals(interleaved[3], 5, "Value 4");
}

test("Interleaved", testInterleaved);

function testCombined() {
    var buffer = new AudioletBuffer(2, 2);
    buffer.channels[0][0] = 1;
    buffer.channels[0][1] = 2;
    buffer.channels[1][0] = 3;
    buffer.channels[1][1] = 5;

    var combined = buffer.combined();
    Assert.assertEquals(combined.length, 4, "Length");
    Assert.assertEquals(combined[0], 1, "Value 1");
    Assert.assertEquals(combined[1], 2, "Value 2");
    Assert.assertEquals(combined[2], 3, "Value 3");
    Assert.assertEquals(combined[3], 5, "Value 4");
}

test("Combined", testCombined);

function testCopy() {
    var buffer1 = new AudioletBuffer(2, 2);
    buffer1.channels[0][0] = 1;
    buffer1.channels[0][1] = 2;
    buffer1.channels[1][0] = 3;
    buffer1.channels[1][1] = 5;

    var buffer2 = buffer1.copy();
    Assert.assertEquals(buffer2.numberOfChannels, 2, "Recorded channels");
    Assert.assertEquals(buffer2.length, 2, "Recorded length");
    Assert.assertEquals(buffer2.numberOfChannels, buffer2.channels.length,
                        "Actual channels");
    Assert.assertEquals(buffer2.length, buffer2.channels[0].length,
                        "Actual length 1");
    Assert.assertEquals(buffer2.length, buffer2.channels[1].length,
                        "Actual length 2");

    Assert.assertEquals(buffer2.channels[0][0], 1, "Value 1");
    Assert.assertEquals(buffer2.channels[0][1], 2, "Value 2");
    Assert.assertEquals(buffer2.channels[1][0], 3, "Value 3");
    Assert.assertEquals(buffer2.channels[1][1], 5, "Value 4");
}

test("Copy", testCopy);



