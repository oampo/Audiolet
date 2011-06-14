load('../../../../audiotest.js/trunk/audiotest.js');
load('../../src/audiofile/audiofile.js');
load('../../src/audiolet/Audiolet.js');
load('../Environment.js');

function testInit() {
    var audiolet = new Audiolet();
    var node = new AudioletNode(audiolet, 3, 4);
    Assert.assertEquals(node.numberOfInputs, 3, "Number of inputs");
    Assert.assertEquals(node.inputs.length, 3, "Actual number of inputs");
    Assert.assertEquals(node.numberOfOutputs, 4, "Number of outputs");
    Assert.assertEquals(node.outputs.length, 4, "Actual number of outputs");
}

test("Initialization", testInit);

function testConnect() {
    var audiolet = new Audiolet();
    var nodeA = new AudioletNode(audiolet, 3, 3);
    var nodeB = new AudioletNode(audiolet, 3, 3);

    // No arguments
    nodeA.connect(nodeB);
    var output = nodeA.outputs[0];
    var input = nodeB.inputs[0];
    Assert.assertEquals(output.connectedTo.length, 1, "Connected to length");
    Assert.assertEquals(input.connectedFrom.length, 1, "Connected from length");

    Assert.assertEquals(output.connectedTo[0], input, "Connected to");
    Assert.assertEquals(input.connectedFrom[0], output, "Connected from");
}

test("Connection", testConnect);

function testConnectArguments() {
    var audiolet = new Audiolet();
    var nodeA = new AudioletNode(audiolet, 3, 3);
    var nodeB = new AudioletNode(audiolet, 3, 3);

    nodeA.connect(nodeB, 1, 2);
    var output = nodeA.outputs[1];
    var input = nodeB.inputs[2];
    Assert.assertEquals(output.connectedTo.length, 1, "Connected to length");
    Assert.assertEquals(input.connectedFrom.length, 1, "Connected from length");

    Assert.assertEquals(output.connectedTo[0], input, "Connected to");
    Assert.assertEquals(input.connectedFrom[0], output, "Connected from");
}

test("Connection with arguments", testConnectArguments);

function testMultipleConnections() {
    var audiolet = new Audiolet();
    var nodeA = new AudioletNode(audiolet, 3, 3);
    var nodeB = new AudioletNode(audiolet, 3, 3);
    var nodeC = new AudioletNode(audiolet, 3, 3);

    nodeA.connect(nodeC, 1, 2);
    nodeB.connect(nodeC, 0, 2);
    var outputA = nodeA.outputs[1];
    var outputB = nodeB.outputs[0];
    var input = nodeC.inputs[2];
    Assert.assertEquals(outputA.connectedTo.length, 1, "Connected to length 1");
    Assert.assertEquals(outputB.connectedTo.length, 1, "Connected to length 2");
    Assert.assertEquals(input.connectedFrom.length, 2, "Connected from length");

    Assert.assertEquals(outputA.connectedTo[0], input, "Connected to 1");
    Assert.assertEquals(outputB.connectedTo[0], input, "Connected to 2");
    Assert.assertEquals(input.connectedFrom[0], outputA, "Connected from 1");
    Assert.assertEquals(input.connectedFrom[1], outputB, "Connected from 2");
}

test("Multiple connections", testMultipleConnections);

function testConnectGroup() {
    var audiolet = new Audiolet();
    var node = new AudioletNode(audiolet, 3, 3);
    var group = new AudioletGroup(audiolet, 3, 3);

    node.connect(group);
    var output = node.outputs[0];
    var input = group.inputs[0].inputs[0];
    Assert.assertEquals(output.connectedTo.length, 1, "Connected to length");
    Assert.assertEquals(input.connectedFrom.length, 1, "Connected from length");

    Assert.assertEquals(output.connectedTo[0], input, "Connected to");
    Assert.assertEquals(input.connectedFrom[0], output, "Connected from");
}

test("Connect to group", testConnectGroup);

function testConnectGroupArguments() {
    var audiolet = new Audiolet();
    var node = new AudioletNode(audiolet, 3, 3);
    var group = new AudioletGroup(audiolet, 3, 3);

    node.connect(group, 1, 2);
    var output = node.outputs[1];
    var input = group.inputs[2].inputs[0];
    Assert.assertEquals(output.connectedTo.length, 1, "Connected to length");
    Assert.assertEquals(input.connectedFrom.length, 1, "Connected from length");

    Assert.assertEquals(output.connectedTo[0], input, "Connected to");
    Assert.assertEquals(input.connectedFrom[0], output, "Connected from");
}

test("Connect to group with arguments", testConnectGroupArguments);


function testDisconnect() {
    var audiolet = new Audiolet();
    var nodeA = new AudioletNode(audiolet, 3, 3);
    var nodeB = new AudioletNode(audiolet, 3, 3);

    nodeA.connect(nodeB);
    nodeA.disconnect(nodeB);
    var output = nodeA.outputs[0];
    var input = nodeB.inputs[0];
    Assert.assertEquals(output.connectedTo.length, 0, "Connected to length");
    Assert.assertEquals(input.connectedFrom.length, 0, "Connected from length");
}

test("Disconnect", testDisconnect);

function testDisconnectArguments() {
    var audiolet = new Audiolet();
    var nodeA = new AudioletNode(audiolet, 3, 3);
    var nodeB = new AudioletNode(audiolet, 3, 3);

    nodeA.connect(nodeB, 1, 2);
    nodeA.disconnect(nodeB, 1, 2);
    var output = nodeA.outputs[1];
    var input = nodeB.inputs[2];
    Assert.assertEquals(output.connectedTo.length, 0, "Connected to length");
    Assert.assertEquals(input.connectedFrom.length, 0, "Connected from length");
}

test("Disconnect with arguments", testDisconnectArguments);


function testDisconnectOne() {
    var audiolet = new Audiolet();
    var nodeA = new AudioletNode(audiolet, 3, 3);
    var nodeB = new AudioletNode(audiolet, 3, 3);
    var nodeC = new AudioletNode(audiolet, 3, 3);

    nodeA.connect(nodeC, 1, 2);
    nodeB.connect(nodeC, 0, 2);
    nodeA.disconnect(nodeC, 1, 2);
    var outputA = nodeA.outputs[1];
    var outputB = nodeB.outputs[0];
    var input = nodeC.inputs[2];
    Assert.assertEquals(outputA.connectedTo.length, 0, "Connected to length 1");
    Assert.assertEquals(outputB.connectedTo.length, 1, "Connected to length 2");
    Assert.assertEquals(input.connectedFrom.length, 1, "Connected from length");

    Assert.assertEquals(outputB.connectedTo[0], input, "Connected to");
    Assert.assertEquals(input.connectedFrom[0], outputB, "Connected from");
}

test("Disconnect one of many", testMultipleConnections);

function testDisconnectGroup() {
    var audiolet = new Audiolet();
    var node = new AudioletNode(audiolet, 3, 3);
    var group = new AudioletGroup(audiolet, 3, 3);

    node.connect(group);
    node.disconnect(group);
    var output = node.outputs[0];
    var input = group.inputs[0].inputs[0];
    Assert.assertEquals(output.connectedTo.length, 0, "Connected to length");
    Assert.assertEquals(input.connectedFrom.length, 0, "Connected from length");
}

test("Disconnect from group", testDisconnectGroup);

function testDisconnectGroupArguments() {
    var audiolet = new Audiolet();
    var node = new AudioletNode(audiolet, 3, 3);
    var group = new AudioletGroup(audiolet, 3, 3);

    node.connect(group, 1, 2);
    node.disconnect(group, 1, 2);
    var output = node.outputs[1];
    var input = group.inputs[2].inputs[0];
    Assert.assertEquals(output.connectedTo.length, 0, "Connected to length");
    Assert.assertEquals(input.connectedFrom.length, 0, "Connected from length");
}

test("Disconnect from group with arguments", testDisconnectGroupArguments);

function testTick() {
    var audiolet = new Audiolet();
    var node = new Introspector(audiolet, 3, 3);
    node.tick(1024, 0);

    Assert.assertEquals(node.timesCalled, 1, "Generate called");
    Assert.assertEquals(node.inputBuffers.length, 3, "Number of input buffers");
    Assert.assertEquals(node.outputBuffers.length, 3,
                        "Number of output buffers");
    Assert.assertEquals(node.inputBuffers[0].length, 1024,
                        "Input buffer length");
    Assert.assertEquals(node.outputBuffers[2].length, 1024,
                        "Output buffer length");
}

test("Tick", testTick);

function testParentsTicked() {
    var audiolet = new Audiolet();
    var nodeA = new Introspector(audiolet, 0, 1);
    var nodeB = new Introspector(audiolet, 1, 1);
    var nodeC = new Introspector(audiolet, 1, 0);

    nodeA.connect(nodeB);
    nodeB.connect(nodeC);

    nodeC.tick(1024, 0);

    Assert.assertEquals(nodeA.timesCalled, 1, "Generate called 1");
    Assert.assertEquals(nodeB.timesCalled, 1, "Generate called 2");
    Assert.assertEquals(nodeC.timesCalled, 1, "Generate called 3");
}

test("Tick parents", testParentsTicked);

function testSingleTickPerTimestamp() {
    var audiolet = new Audiolet();
    var nodeA = new Introspector(audiolet, 0, 1);
    var nodeB = new Introspector(audiolet, 1, 1);
    var nodeC = new Introspector(audiolet, 1, 1);
    var nodeD = new Introspector(audiolet, 1, 0);

    nodeA.connect(nodeB);
    nodeA.connect(nodeC);
    nodeB.connect(nodeD);
    nodeC.connect(nodeD);

    nodeD.tick(1024, 0);

    Assert.assertEquals(nodeA.timesCalled, 1, "Generate called 1");
    Assert.assertEquals(nodeB.timesCalled, 1, "Generate called 2");
    Assert.assertEquals(nodeC.timesCalled, 1, "Generate called 3");
    Assert.assertEquals(nodeD.timesCalled, 1, "Generate called 3");

    // Call with different timestamp
    nodeD.tick(1024, 1);
    Assert.assertEquals(nodeA.timesCalled, 2, "Second generate called 1");
    Assert.assertEquals(nodeB.timesCalled, 2, "Second generate called 2");
    Assert.assertEquals(nodeC.timesCalled, 2, "Second generate called 3");
    Assert.assertEquals(nodeD.timesCalled, 2, "Second generate called 3");
}

test("Single click per timestamp", testSingleTickPerTimestamp);

function testInputBufferDisconnected() {
    var audiolet = new Audiolet();
    var node = new Introspector(audiolet, 3, 3);
    var inputBuffers = node.createInputBuffers(1024);

    Assert.assertEquals(inputBuffers.length, 3, "Number of buffers");
    Assert.assertEquals(inputBuffers[0].length, 1024, "Buffer length 1");
    Assert.assertEquals(inputBuffers[2].length, 1024, "Buffer length 2");

    Assert.assertEquals(inputBuffers[1].numberOfChannels, 1,
                        "Number of channels 1");
    Assert.assertEquals(inputBuffers[2].numberOfChannels, 1,
                        "Number of channels 2");

    Assert.assertEquals(inputBuffers[0].isEmpty, true, "Buffer empty 1");
    Assert.assertEquals(inputBuffers[1].isEmpty, true, "Buffer empty 2");
}

test("Input buffer creation for disconnected node",
     testInputBufferDisconnected);
    
function testInputBufferConnected() {
    var audiolet = new Audiolet();
    var nodeA = new ConstantSource(audiolet, 3, 1);
    var nodeB = new Introspector(audiolet, 3, 3);
    nodeA.connect(nodeB, 1, 2);

    // Make sure node A has generated
    nodeA.tick(1024, 0);
    var inputBuffers = nodeB.createInputBuffers(1024);

    Assert.assertEquals(inputBuffers.length, 3, "Number of buffers");
    
    Assert.assertEquals(inputBuffers[0].length, 1024, "Buffer length 1");
    Assert.assertEquals(inputBuffers[2].length, 1024, "Buffer length 2");

    Assert.assertEquals(inputBuffers[0].numberOfChannels, 1,
                        "Number of channels 1");
    Assert.assertEquals(inputBuffers[2].numberOfChannels, 1,
                        "Number of channels 2");
    
    Assert.assertEquals(inputBuffers[0].isEmpty, true, "Buffer empty");
    Assert.assertEquals(inputBuffers[2].isEmpty, false, "Buffer not empty");

    var data = inputBuffers[2].getChannelData(0);
    Assert.assertEquals(data[0], 1, "Start data");
    Assert.assertEquals(data[512], 1, "Middle data");
    Assert.assertEquals(data[1023], 1, "End data");
}

test("Input buffer creation for connected node", testInputBufferConnected);

function testInputBufferMultipleConnections() {
    var audiolet = new Audiolet();
    var nodeA = new ConstantSource(audiolet, 3, 1);
    var nodeB = new ConstantSource(audiolet, 3, 2);
    var nodeC = new Introspector(audiolet, 3, 3);
    nodeA.connect(nodeC, 1, 2);
    nodeB.connect(nodeC, 0, 2);

    nodeA.setNumberOfOutputChannels(1, 2);

    // Make sure nodes have has generated
    nodeA.tick(1024, 0);
    nodeB.tick(1024, 0);
    var inputBuffers = nodeC.createInputBuffers(1024);

    Assert.assertEquals(inputBuffers.length, 3, "Number of buffers");

    Assert.assertEquals(inputBuffers[0].length, 1024, "Buffer length 1");
    Assert.assertEquals(inputBuffers[2].length, 1024, "Buffer length 2");

    Assert.assertEquals(inputBuffers[0].numberOfChannels, 1,
                        "Number of channels 1");
    Assert.assertEquals(inputBuffers[2].numberOfChannels, 2,
                        "Number of channels 2");

    Assert.assertEquals(inputBuffers[0].isEmpty, true, "Buffer empty");
    Assert.assertEquals(inputBuffers[2].isEmpty, false, "Buffer not empty");

    // Check that the inputs are summed on the first channel
    var data = inputBuffers[2].getChannelData(0);
    Assert.assertEquals(data[0], 3, "Start data");
    Assert.assertEquals(data[512], 3, "Middle data");
    Assert.assertEquals(data[1023], 3, "End data");

    // But we should just get the output from nodeA on the second channel
    data = inputBuffers[2].getChannelData(1);
    Assert.assertEquals(data[0], 1, "Start data");
    Assert.assertEquals(data[512], 1, "Middle data");
    Assert.assertEquals(data[1023], 1, "End data");
}

test("Input buffer creation for node with multiple connections",
     testInputBufferMultipleConnections);

function testCreateOutputBuffers() {
    var audiolet = new Audiolet();
    var node = new Introspector(audiolet, 3, 3);

    var outputBuffers = node.createOutputBuffers(1024);

    Assert.assertEquals(outputBuffers.length, 3, "Number of buffers");
    Assert.assertEquals(outputBuffers[0].length, 1024, "Buffer length 1");
    Assert.assertEquals(outputBuffers[2].length, 1024, "Buffer length 2");

    Assert.assertEquals(outputBuffers[1].numberOfChannels, 1,
                        "Number of channels 1");
    Assert.assertEquals(outputBuffers[2].numberOfChannels, 1,
                        "Number of channels 2");

    Assert.assertEquals(outputBuffers[0].isEmpty, false, "Buffer empty 1");
    Assert.assertEquals(outputBuffers[1].isEmpty, false, "Buffer empty 2");
}

test("Output buffer creation", testCreateOutputBuffers);

function testSetNumberOfChannels() {
    var audiolet = new Audiolet();
    var node = new Introspector(audiolet, 3, 3);
    node.setNumberOfOutputChannels(1, 2);

    var outputBuffers = node.createOutputBuffers(1024);

    Assert.assertEquals(outputBuffers[0].numberOfChannels, 1,
                        "Number of channels 1");
    Assert.assertEquals(outputBuffers[1].numberOfChannels, 2,
                        "Number of channels 2");
    Assert.assertEquals(outputBuffers[2].numberOfChannels, 1,
                        "Number of channels 3");
}

test("Set number of output channels", testSetNumberOfChannels);

function testLinkNumberOfChannels() {
    var audiolet = new Audiolet();
    var nodeA = new ConstantSource(audiolet, 3, 1);
    var nodeB = new Introspector(audiolet, 3, 3);

    nodeA.connect(nodeB, 1, 2);
    // Output 1 should have the same number of channels as input 2, which is
    // connected from output 1 of nodeA
    nodeB.linkNumberOfOutputChannels(1, 2);

    nodeA.tick(1024, 0);
    var inputBuffers = nodeB.createInputBuffers(1024);
    var outputBuffers = nodeB.createOutputBuffers(1024);

    Assert.assertEquals(outputBuffers[0].numberOfChannels, 1,
                        "Number of channels 1");
    Assert.assertEquals(outputBuffers[1].numberOfChannels, 1,
                        "Number of channels 2");
    Assert.assertEquals(outputBuffers[2].numberOfChannels, 1,
                        "Number of channels 3");

    // Change the number of channels coming into nodeB
    nodeA.setNumberOfOutputChannels(1, 2);
    nodeA.tick(1024, 1);
    var inputBuffers = nodeB.createInputBuffers(1024);
    var outputBuffers = nodeB.createOutputBuffers(1024);

    // Make sure that the linking reflects the change
    Assert.assertEquals(outputBuffers[0].numberOfChannels, 1,
                        "Number of channels 1");
    Assert.assertEquals(outputBuffers[1].numberOfChannels, 2,
                        "Number of channels 2");        
    Assert.assertEquals(outputBuffers[2].numberOfChannels, 1,
                        "Number of channels 3");
}

test("Link number of output channels", testLinkNumberOfChannels);

function testRemove() {
    var audiolet = new Audiolet();
    var nodeA = new AudioletNode(audiolet, 3, 3);
    var nodeB = new AudioletNode(audiolet, 3, 3);
    var nodeC = new AudioletNode(audiolet, 3, 3);
    var nodeD = new AudioletNode(audiolet, 3, 3);

    nodeA.connect(nodeC);
    nodeB.connect(nodeC, 1, 2);
    nodeC.connect(nodeD, 2, 1);
    
    nodeC.remove();
    
    var outputA = nodeA.outputs[0];
    var outputB = nodeB.outputs[1];
    var inputA = nodeC.inputs[0];
    var inputB = nodeC.inputs[2];
    var outputC = nodeC.outputs[2];
    var inputC = nodeD.inputs[1];

    Assert.assertEquals(outputA.connectedTo.length, 0, "Connected to length 1");
    Assert.assertEquals(outputB.connectedTo.length, 0, "Connected to length 2");
    Assert.assertEquals(outputC.connectedTo.length, 0, "Connected to length 3");

    Assert.assertEquals(inputA.connectedFrom.length, 0,
                        "Connected from length 1");
    Assert.assertEquals(inputB.connectedFrom.length, 0,
                        "Connected from length 2");
    Assert.assertEquals(inputC.connectedFrom.length, 0,
                        "Connected from length 3");

}

test("Remove", testRemove);
