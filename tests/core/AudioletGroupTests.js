load('../../../../audiotest.js/trunk/audiotest.js');
load('../../src/audiofile/audiofile.js');
load('../../src/audiolet/Audiolet.js');
load('../Environment.js');

function testInit() {
    var audiolet = new Audiolet();
    var node = new AudioletGroup(audiolet, 3, 4);
    Assert.assertEquals(node.inputs.length, 3, "Actual number of inputs");
    Assert.assertEquals(node.outputs.length, 4, "Actual number of outputs");
}

test("Initialization", testInit);

function testConnect() {
    var audiolet = new Audiolet();
    var group = new AudioletGroup(audiolet, 3, 3);
    var node = new AudioletNode(audiolet, 3, 3);

    // No arguments
    group.connect(node);
    var output = group.outputs[0].outputs[0];
    var input = node.inputs[0];
    Assert.assertEquals(output.connectedTo.length, 1, "Connected to length");
    Assert.assertEquals(input.connectedFrom.length, 1, "Connected from length");

    Assert.assertEquals(output.connectedTo[0], input, "Connected to");
    Assert.assertEquals(input.connectedFrom[0], output, "Connected from");
}

test("Connection", testConnect);

function testConnectArguments() {
    var audiolet = new Audiolet();
    var group = new AudioletGroup(audiolet, 3, 3);
    var node = new AudioletNode(audiolet, 3, 3);

    group.connect(node, 1, 2);
    var output = group.outputs[1].outputs[0];
    var input = node.inputs[2];
    Assert.assertEquals(output.connectedTo.length, 1, "Connected to length");
    Assert.assertEquals(input.connectedFrom.length, 1, "Connected from length");

    Assert.assertEquals(output.connectedTo[0], input, "Connected to");
    Assert.assertEquals(input.connectedFrom[0], output, "Connected from");
}

test("Connection with arguments", testConnectArguments);

function testConnectGroup() {
    var audiolet = new Audiolet();
    var groupA = new AudioletGroup(audiolet, 3, 3);
    var groupB = new AudioletGroup(audiolet, 3, 3);

    groupA.connect(groupB);
    var output = groupA.outputs[0].outputs[0];
    var input = groupB.inputs[0].inputs[0];
    Assert.assertEquals(output.connectedTo.length, 1, "Connected to length");
    Assert.assertEquals(input.connectedFrom.length, 1, "Connected from length");

    Assert.assertEquals(output.connectedTo[0], input, "Connected to");
    Assert.assertEquals(input.connectedFrom[0], output, "Connected from");
}

test("Connect to group", testConnectGroup);

function testConnectGroupArguments() {
    var audiolet = new Audiolet();
    var groupA = new AudioletGroup(audiolet, 3, 3);
    var groupB = new AudioletGroup(audiolet, 3, 3);

    groupA.connect(groupB, 1, 2);
    var output = groupA.outputs[1].outputs[0];
    var input = groupB.inputs[2].inputs[0];
    Assert.assertEquals(output.connectedTo.length, 1, "Connected to length");
    Assert.assertEquals(input.connectedFrom.length, 1, "Connected from length");

    Assert.assertEquals(output.connectedTo[0], input, "Connected to");
    Assert.assertEquals(input.connectedFrom[0], output, "Connected from");
}

test("Connect to group with arguments", testConnectGroupArguments);


function testDisconnect() {
    var audiolet = new Audiolet();
    var group = new AudioletGroup(audiolet, 3, 3);
    var node = new AudioletNode(audiolet, 3, 3);

    group.connect(node);
    group.disconnect(node);
    var output = group.outputs[0].outputs[0];
    var input = node.inputs[0];
    Assert.assertEquals(output.connectedTo.length, 0, "Connected to length");
    Assert.assertEquals(input.connectedFrom.length, 0, "Connected from length");
}

test("Disconnect", testDisconnect);

function testDisconnectArguments() {
    var audiolet = new Audiolet();
    var group = new AudioletGroup(audiolet, 3, 3);
    var node = new AudioletNode(audiolet, 3, 3);

    group.connect(node, 1, 2);
    group.disconnect(node, 1, 2);
    var output = group.outputs[1].outputs[0];
    var input = node.inputs[2];
    Assert.assertEquals(output.connectedTo.length, 0, "Connected to length");
    Assert.assertEquals(input.connectedFrom.length, 0, "Connected from length");
}

test("Disconnect with arguments", testDisconnectArguments);

function testDisconnectGroup() {
    var audiolet = new Audiolet();
    var groupA = new AudioletGroup(audiolet, 3, 3);
    var groupB = new AudioletGroup(audiolet, 3, 3);

    groupA.connect(groupB);
    groupA.disconnect(groupB);
    var output = groupA.outputs[0].outputs[0];
    var input = groupB.inputs[0].inputs[0];
    Assert.assertEquals(output.connectedTo.length, 0, "Connected to length");
    Assert.assertEquals(input.connectedFrom.length, 0, "Connected from length");
}

test("Disconnect from group", testDisconnectGroup);

function testDisconnectGroupArguments() {
    var audiolet = new Audiolet();
    var groupA = new AudioletGroup(audiolet, 3, 3);
    var groupB = new AudioletGroup(audiolet, 3, 3);

    groupA.connect(groupB, 1, 2);
    groupA.disconnect(groupB, 1, 2);
    var output = groupA.outputs[1].outputs[0];
    var input = groupB.inputs[2].inputs[0];
    Assert.assertEquals(output.connectedTo.length, 0, "Connected to length");
    Assert.assertEquals(input.connectedFrom.length, 0, "Connected from length");
}

test("Disconnect from group with arguments", testDisconnectGroupArguments);

function testRemove() {
    var audiolet = new Audiolet();
    var nodeA = new AudioletNode(audiolet, 3, 3);
    var nodeB = new AudioletNode(audiolet, 3, 3);
    var group = new AudioletGroup(audiolet, 3, 3);
    var nodeC = new AudioletNode(audiolet, 3, 3);

    nodeA.connect(group);
    nodeB.connect(group, 1, 2);
    group.connect(nodeC, 2, 1);
    
    group.remove();
    
    var outputA = nodeA.outputs[0];
    var outputB = nodeB.outputs[1];
    var inputA = group.inputs[0].inputs[0];
    var inputB = group.inputs[2].inputs[0];
    var outputC = group.outputs[2].outputs[0];
    var inputC = nodeC.inputs[1];

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
