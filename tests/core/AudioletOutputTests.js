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

function testChannelLinking() {
    var outputA = new AudioletOutput(null, 0);
    var outputB = new AudioletOutput(null, 1);
    var input = new AudioletInput(null, 0);

    // Should be single channel as output is not linked
    Assert.assertEquals(outputA.getNumberOfChannels(), 1, "Channels 1");
    
    outputA.linkNumberOfChannels(input);

    // Multi-channel input buffer
    input.samples = [0, 0, 0, 0, 0];

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
