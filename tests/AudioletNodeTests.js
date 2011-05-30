load('Environment.js');
load('../../../audiotest.js/trunk/audiotest.js');
load('mootools-core-1.3.1.js');
load('../src/audiofile/audiofile.js');
load('../src/audiolet/Audiolet.js');

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

