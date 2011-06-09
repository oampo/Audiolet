load('../../../../audiotest.js/trunk/audiotest.js');
load('../../src/audiofile/audiofile.js');
load('../../src/audiolet/Audiolet.js');
load('../Environment.js');

function testInit() {
    var audiolet = new Audiolet();
    var node = new AudioletNode(audiolet, 2, 0);
    var parameter = new AudioletParameter(node, 1, 7);
    Assert.assertEquals(parameter.node, node, "Node");
    Assert.assertEquals(parameter.input, node.inputs[1], "Input");
    Assert.assertEquals(parameter.value, 7, "Value");
}

test("Initialization", testInit);

function testIsStatic() {
    var audiolet = new Audiolet();
    var nodeA = new EmptySource(audiolet, 1);
    var nodeB = new ConstantSource(audiolet, 1, 1);
    var nodeC = new AudioletNode(audiolet, 2, 0);
    var parameter = new AudioletParameter(nodeC, 1, 7);

    Assert.assertEquals(parameter.isStatic(), true, "Static");

    nodeA.connect(nodeC, 0, 1);
    nodeC.tick(1024, 0);

    // Should still be static, as the input buffer is still empty
    Assert.assertEquals(parameter.isStatic(), true, "Static after connection");


    nodeB.connect(nodeC, 0, 1);
    nodeC.tick(1024, 1);

    // Should be dynamic, as the input buffer is not empty
    Assert.assertEquals(parameter.isStatic(), false, "Not static");
}

test("Is Static", testIsStatic);

function testIsDynamic() {
    var audiolet = new Audiolet();
    var nodeA = new EmptySource(audiolet, 1);
    var nodeB = new ConstantSource(audiolet, 1, 1);
    var nodeC = new AudioletNode(audiolet, 2, 0);
    var parameter = new AudioletParameter(nodeC, 1, 7);

    Assert.assertEquals(parameter.isDynamic(), false, "Not dynamic");

    nodeA.connect(nodeC, 0, 1);
    nodeC.tick(1024, 0);

    // Should still be static, as the input buffer is still empty
    Assert.assertEquals(parameter.isDynamic(), false,
                        "Not dynamic after connection");


    nodeB.connect(nodeC, 0, 1);
    nodeC.tick(1024, 1);
   
    // Should be dynamic, as the input buffer is not empty
    Assert.assertEquals(parameter.isDynamic(), true, "Dynamic");
}

test("Is Dynamic", testIsDynamic);

function testSetValue() {
    var audiolet = new Audiolet();
    var node = new AudioletNode(audiolet, 2, 0);
    var parameter = new AudioletParameter(node);

    parameter.setValue(5);
    Assert.assertEquals(parameter.value, 5);
}

test("Set value", testSetValue);

function testGetValue() {
    var audiolet = new Audiolet();
    var node = new AudioletNode(audiolet, 2, 0);
    var parameter = new AudioletParameter(node, null, 10);

    Assert.assertEquals(parameter.getValue(), 10);
}

test("Get value", testGetValue);

function testGetChannel() {
    var audiolet = new Audiolet();
    var nodeA = new ConstantSource(audiolet, 1, 1);
    var nodeB = new AudioletNode(audiolet, 2, 0);
    var parameter = new AudioletParameter(nodeB, 1, 7);

    nodeA.connect(nodeB, 0, 1);
    nodeB.tick(1024, 0);

    var channel = parameter.getChannel();
    Assert.assertEquals(channel.length, 1024, "Channel length");
    Assert.assertEquals(channel[0], 1, "Value 1");
    Assert.assertEquals(channel[channel.length / 2], 1, "Value 2");
    Assert.assertEquals(channel[channel.length - 1], 1, "Value 3");
}

test("Get channel", testGetChannel);

