load('../../../../audiotest.js/trunk/audiotest.js');
load('../../src/audiofile/audiofile.js');
load('../../src/audiolet/Audiolet.js');
load('../Environment.js');

function testInit() {
    var audiolet = new Audiolet();
    var node = new AudioletNode(audiolet, 0, 1);
    var input = new AudioletInput(node, 0);
    Assert.assertEquals(input.node, node, "Node");
    Assert.assertEquals(input.index, 0, "Index");
}

test("Initialization", testInit);

function testConnect() {
    var input = new AudioletInput(null, 0);
    var outputA = new AudioletOutput(null, 1);
    var outputB = new AudioletOutput(null, 2);

    input.connect(outputA);
    input.connect(outputB);
    Assert.assertEquals(input.connectedFrom.length, 2, "Connected from length");
    Assert.assertEquals(input.connectedFrom[0], outputA, "Output 1");
    Assert.assertEquals(input.connectedFrom[1], outputB, "Output 2");
}

test("Connection", testConnect);

function testDisconnect() {
    var input = new AudioletInput(null, 0);
    var outputA = new AudioletOutput(null, 1);
    var outputB = new AudioletOutput(null, 2);

    input.connect(outputA);
    input.connect(outputB);
    input.disconnect(outputA);
    Assert.assertEquals(input.connectedFrom.length, 1, "Connected from length");
    Assert.assertEquals(input.connectedFrom[0], outputB, "Output");
}

test("Disconnect", testDisconnect);

