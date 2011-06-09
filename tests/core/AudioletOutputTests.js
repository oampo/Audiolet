load('../../../../audiotest.js/trunk/audiotest.js');
load('../../src/audiofile/audiofile.js');
load('../../src/audiolet/Audiolet.js');
load('../Environment.js');

function testInit() {
    var audiolet = new Audiolet();
    var node = new AudioletNode(audiolet, 0, 1);
    var output = new AudioletOutput(node, 0);
    Assert.assertEquals(output.node, node, "Node");
    Assert.assertEquals(output.index, 0, "Index");
}

test("Initialization", testInit);

function testConnect() {
    var output = new AudioletOutput(null, 0);
    var inputA = new AudioletInput(null, 1);
    var inputB = new AudioletInput(null, 2);

    output.connect(inputA);
    output.connect(inputB);
    Assert.assertEquals(output.connectedTo.length, 2, "Connected from length");
    Assert.assertEquals(output.connectedTo[0], inputA, "Input 1");
    Assert.assertEquals(output.connectedTo[1], inputB, "Input 2");
}

test("Connection", testConnect);

function testDisconnect() {
    var output = new AudioletOutput(null, 0);
    var inputA = new AudioletInput(null, 1);
    var inputB = new AudioletInput(null, 2);

    output.connect(inputA);
    output.connect(inputB);
    output.disconnect(inputA);
    Assert.assertEquals(output.connectedTo.length, 1, "Connected from length");
    Assert.assertEquals(output.connectedTo[0], inputB, "Input");
}

test("Disconnect", testDisconnect);

function testIsConnected() {
    var output = new AudioletOutput(null, 0);
    var input = new AudioletInput(null, 1);

    output.connect(input);
    Assert.assertEquals(output.isConnected(), true, "Connected");

    output.disconnect(input);
    Assert.assertEquals(output.isConnected(), false, "Not connected");
}

test("Is Connected", testIsConnected);

function testChannelLinking() {
    var outputA = new AudioletOutput(null, 0);
    var outputB = new AudioletOutput(null, 1);
    var input = new AudioletInput(null, 0);

    // Should be single channel as output is not linked
    Assert.assertEquals(outputA.getNumberOfChannels(), 1, "Channels 1");
    
    outputA.linkNumberOfChannels(input);

    // Multi-channel input buffer
    input.buffer.resize(5, 1024);

    // Should be single channel as linked input is not connected
    Assert.assertEquals(outputA.getNumberOfChannels(), 1, "Channels 2");

    input.connect(outputB);
    Assert.assertEquals(outputA.getNumberOfChannels(), 5, "Channels 3");
}
test("Channel linking", testChannelLinking);

function testChannelUnlinking() {
    var outputA = new AudioletOutput(null, 0);
    var outputB = new AudioletOutput(null, 1);
    var input = new AudioletInput(null, 0);


    outputA.linkNumberOfChannels(input);
    input.connect(outputB);

    outputA.unlinkNumberOfChannels();
    Assert.assertEquals(outputA.getNumberOfChannels(), 1, "Channels");
}
test("Channel unlinking", testChannelUnlinking);

function testGetBufferRegular() {
    // Regular no feedback functioning
    var output = new AudioletOutput(null, 0);
    output.buffer.resize(1, 1024);
    var buffer = output.getBuffer(1024);
    Assert.assertEquals(buffer.length, 1024, "Length 1");
    Assert.assertEquals(buffer.numberOfChannels, 1, "Number of channels 1");

    output.buffer.resize(2, 100);
    buffer = output.getBuffer(100);
    Assert.assertEquals(buffer.length, 100, "Length 2");
    Assert.assertEquals(buffer.numberOfChannels, 2, "Number of channels 2");
}

test("Normal buffer retrieval", testGetBufferRegular);

function testGetBufferFeedback() {
    var audiolet = new Audiolet();
    var node = new AudioletNode(audiolet, 1, 1);
    var output = new AudioletOutput(node, 0);
    var maximumBlockSize = audiolet.blockSizeLimiter.maximumBlockSize;

    // Feedback loop when we try to get a buffer of the wrong length
    node.timestamp = 0; // Mimic tick behaviour
    // Fill the input buffer
    output.buffer.resize(1, 2048);
    var bufferData = output.buffer.getChannelData(0);
    for (var i=0; i<bufferData.length; i++) {
        bufferData[i] = 1;
    }
    

    // Get the delay section
    var buffer = output.getBuffer(maximumBlockSize);
    var data = buffer.getChannelData(0);
    Assert.assertEquals(buffer.length, maximumBlockSize, "Buffer length 1");
    Assert.assertEquals(buffer.numberOfChannels, 1, "Number of channels 1");
    Assert.assertEquals(data[0], 0, "Value 1");
    Assert.assertEquals(data[buffer.length/2], 0, "Value 2");
    Assert.assertEquals(data[buffer.length - 1], 0, "Value 3");

    // Same timestamp - should get the same data
    var buffer = output.getBuffer(maximumBlockSize);
    var data = buffer.getChannelData(0);
    Assert.assertEquals(buffer.length, maximumBlockSize, "Buffer length 1");
    Assert.assertEquals(buffer.numberOfChannels, 1, "Number of channels 1");
    Assert.assertEquals(data[0], 0, "Value 4");
    Assert.assertEquals(data[buffer.length/2], 0, "Value 5");
    Assert.assertEquals(data[buffer.length - 1], 0, "Value 6");
    
    // Get the next block of data - should be the first half of the filled
    // buffer
    output.buffer.resize(1, maximumBlockSize);
    output.buffer.zero();
    node.timestamp = 1;

    var buffer = output.getBuffer(1024);
    var data = buffer.getChannelData(0);
    Assert.assertEquals(buffer.length, 1024, "Buffer length 1");
    Assert.assertEquals(buffer.numberOfChannels, 1, "Number of channels 1");
    Assert.assertEquals(data[0], 1, "Value 7");
    Assert.assertEquals(data[buffer.length/2], 1, "Value 8");
    Assert.assertEquals(data[buffer.length - 1], 1, "Value 9");

    // Get a larger block - first half should be the rest of the filled buffer,
    // second half should be zeros
    output.buffer.resize(1, 1024);
    node.timestamp = 2;

    var buffer = output.getBuffer(2048);
    var data = buffer.getChannelData(0);
    Assert.assertEquals(buffer.length, 2048, "Buffer length 1");
    Assert.assertEquals(buffer.numberOfChannels, 1, "Number of channels 1");
    Assert.assertEquals(data[0], 1, "Value 10");
    Assert.assertEquals(data[1023], 1, "Value 11");
    Assert.assertEquals(data[1024], 0, "Value 12");
    Assert.assertEquals(data[buffer.length - 1], 0, "Value 13");
}

test("Feedback buffer retreival", testGetBufferFeedback);
