load('../../../../audiotest.js/trunk/audiotest.js');
load('../../src/audiofile/audiofile.js');
load('../../src/audiolet/Audiolet.js');
load('../Environment.js');

function testInit() {
    var audiolet = new Audiolet();
    var node = new AudioletNode(audiolet, 3, 4);
    Assert.assertEquals(node.inputs.length, 3, "Actual number of inputs");
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
    node.tick();

    Assert.assertEquals(node.timesCalled, 1, "Generate called");
    Assert.assertEquals(node.inputs.length, 3, "Number of inputs");
    Assert.assertEquals(node.outputs.length, 3, "Number of outputs");
    Assert.assertEquals(node.inputs[0].samples.length, 0,
                        "Number of channels 1");
    Assert.assertEquals(node.inputs[2].samples.length, 0,
                        "Number of channels 2");
}

test("Tick", testTick);

function testParentsTraversed() {
    var audiolet = new Audiolet();
    var nodeA = new AudioletNode(audiolet, 0, 1);
    var nodeB = new AudioletNode(audiolet, 1, 1);
    var nodeC = new AudioletNode(audiolet, 1, 0);

    nodeA.connect(nodeB);
    nodeB.connect(nodeC);

    var nodes = nodeC.traverse([]);

    Assert.assertEquals(nodes.indexOf(nodeA), 0, "Traversed 1");
    Assert.assertEquals(nodes.indexOf(nodeB), 1, "Traversed 2");
    Assert.assertEquals(nodes.indexOf(nodeC), 2, "Traversed 3");
}

test("Traverse Parents", testParentsTraversed);

function testInputSamplesDisconnected() {
    var audiolet = new Audiolet();
    var node = new AudioletNode(audiolet, 3, 3);
    node.createInputSamples();

    Assert.assertEquals(node.inputs.length, 3, "Number of inputs");

    Assert.assertEquals(node.inputs[1].samples.length, 0,
                        "Number of channels 1");
    Assert.assertEquals(node.inputs[2].samples.length, 0,
                        "Number of channels 2");
}

test("Input sample creation for disconnected node",
     testInputSamplesDisconnected);
    
function testInputSamplesConnected() {
    var audiolet = new Audiolet();
    var nodeA = new ConstantSource(audiolet, 3, 1);
    var nodeB = new AudioletNode(audiolet, 3, 3);
    nodeA.connect(nodeB, 1, 2);

    // Make sure node A has generated
    nodeA.tick();
    nodeB.createInputSamples();

    Assert.assertEquals(nodeB.inputs.length, 3, "Number of inputs");
    
    Assert.assertEquals(nodeB.inputs[0].samples.length, 0,
                        "Number of channels 1");
    Assert.assertEquals(nodeB.inputs[2].samples.length, 1,
                        "Number of channels 2");
    
    Assert.assertEquals(nodeB.inputs[2].samples[0], 1, "Sample one");
}

test("Input sample creation for connected node", testInputSamplesConnected);

function testInputSamplesMultipleConnections() {
    var audiolet = new Audiolet();
    var nodeA = new ConstantSource(audiolet, 3, 1);
    var nodeB = new ConstantSource(audiolet, 3, 2);
    var nodeC = new AudioletNode(audiolet, 3, 3);
    nodeA.connect(nodeC, 1, 2);
    nodeB.connect(nodeC, 0, 2);

    nodeA.setNumberOfOutputChannels(1, 2);

    // Make sure nodes have has generated
    nodeA.tick();
    nodeB.tick();
    nodeC.createInputSamples();

    Assert.assertEquals(nodeC.inputs.length, 3, "Number of inputs");

    Assert.assertEquals(nodeC.inputs[0].samples.length, 0,
                        "Number of channels 1");
    Assert.assertEquals(nodeC.inputs[2].samples.length, 2,
                        "Number of channels 2");

    // Check that the inputs are summed on the first channel
    Assert.assertEquals(nodeC.inputs[2].samples[0], 3, "Sample three");
    // But we should just get the output from nodeA on the second channel
    Assert.assertEquals(nodeC.inputs[2].samples[1], 1, "Sample one");
}

test("Input sample creation for node with multiple connections",
     testInputSamplesMultipleConnections);

function testCreateOutputSamples() {
    var audiolet = new Audiolet();
    var node = new AudioletNode(audiolet, 3, 3);

    node.createOutputSamples();

    Assert.assertEquals(node.outputs.length, 3, "Number of outputs");

    Assert.assertEquals(node.outputs[1].samples.length, 1,
                        "Number of channels 1");
    Assert.assertEquals(node.outputs[2].samples.length, 1,
                        "Number of channels 2");
}

test("Output sample creation", testCreateOutputSamples);

function testSetNumberOfChannels() {
    var audiolet = new Audiolet();
    var node = new Introspector(audiolet, 3, 3);
    node.setNumberOfOutputChannels(1, 2);

    node.createOutputSamples();

    Assert.assertEquals(node.outputs[0].samples.length, 1,
                        "Number of channels 1");
    Assert.assertEquals(node.outputs[1].samples.length, 2,
                        "Number of channels 2");
    Assert.assertEquals(node.outputs[2].samples.length, 1,
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

    nodeA.tick();
    nodeB.createInputSamples();
    nodeB.createOutputSamples();

    Assert.assertEquals(nodeB.outputs[0].samples.length, 1,
                        "Number of channels 1");
    Assert.assertEquals(nodeB.outputs[1].samples.length, 1,
                        "Number of channels 2");
    Assert.assertEquals(nodeB.outputs[2].samples.length, 1,
                        "Number of channels 3");

    // Change the number of channels coming into nodeB
    nodeA.setNumberOfOutputChannels(1, 2);
    nodeA.tick();
    nodeB.createInputSamples();
    nodeB.createOutputSamples();

    // Make sure that the linking reflects the change
    Assert.assertEquals(nodeB.outputs[0].samples.length, 1,
                        "Number of channels 1");
    Assert.assertEquals(nodeB.outputs[1].samples.length, 2,
                        "Number of channels 2");        
    Assert.assertEquals(nodeB.outputs[2].samples.length, 1,
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
