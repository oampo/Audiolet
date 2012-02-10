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
    var nodeA = new ConstantSource(audiolet, 1, 1);
    var nodeB = new AudioletNode(audiolet, 2, 0);
    var parameter = new AudioletParameter(nodeB, 1, 7);

    // Nothing connected, so should be static
    Assert.assertEquals(parameter.isStatic(), true, "Static");

    nodeA.connect(nodeB, 0, 1);
    nodeA.tick();
    nodeB.tick();

    // Should be dynamic, as we are connected
    Assert.assertEquals(parameter.isStatic(), false, "Not static");
}

test("Is Static", testIsStatic);

function testIsDynamic() {
    var audiolet = new Audiolet();
    var nodeA = new ConstantSource(audiolet, 1, 1);
    var nodeB = new AudioletNode(audiolet, 2, 0);
    var parameter = new AudioletParameter(nodeB, 1, 7);

    // Should be static, as nothing is connected
    Assert.assertEquals(parameter.isDynamic(), false, "Not dynamic");

    nodeA.connect(nodeB, 0, 1);
    nodeA.tick();
    nodeB.tick();

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

