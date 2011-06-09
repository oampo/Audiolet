load('../../../../audiotest.js/trunk/audiotest.js');
load('../../src/audiofile/audiofile.js');
load('../../src/audiolet/Audiolet.js');
load('../Environment.js');

function testInit() {
    var audiolet = new Audiolet();
    var node = new PassThroughNode(audiolet, 3, 4);
    Assert.assertEquals(node.numberOfInputs, 3, "Number of inputs");
    Assert.assertEquals(node.inputs.length, 3, "Actual number of inputs");
    Assert.assertEquals(node.numberOfOutputs, 4, "Number of outputs");
    Assert.assertEquals(node.outputs.length, 4, "Actual number of outputs");
}

test("Initialization", testInit);

function testCreateOutputBuffers() {
    var audiolet = new Audiolet();
    var node = new PassThroughNode(audiolet, 1, 2);

    // Fill input buffer - should get copied over
    var inputBuffer = node.inputs[0].buffer;
    inputBuffer.resize(2, 1024);
    var data = inputBuffer.getChannelData(0);
    for (var i=0; i<inputBuffer.length; i++) {
        data[i] = 1;
    }

    var outputBuffers = node.createOutputBuffers(1024);

    Assert.assertEquals(outputBuffers.length, 2, "Number of buffers");
    Assert.assertEquals(outputBuffers[0].length, 1024, "Buffer length 1");
    Assert.assertEquals(outputBuffers[1].length, 1024, "Buffer length 2");

    Assert.assertEquals(outputBuffers[0].numberOfChannels, 2,
                        "Number of channels 1");
    Assert.assertEquals(outputBuffers[1].numberOfChannels, 1,
                        "Number of channels 2");

    Assert.assertEquals(outputBuffers[0].isEmpty, false, "Buffer empty 1");
    Assert.assertEquals(outputBuffers[1].isEmpty, false, "Buffer empty 2");

    var data = outputBuffers[0].getChannelData(0);
    Assert.assertEquals(data[0], 1, "Value 1");
    Assert.assertEquals(data[data.length - 1], 1, "Value 2");

    var data = outputBuffers[1].getChannelData(0);
    Assert.assertEquals(data[0], 0, "Value 3");
    Assert.assertEquals(data[data.length - 1], 0, "Value 4");
}

test("Output buffer creation", testCreateOutputBuffers);

