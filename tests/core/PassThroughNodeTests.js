load('../../../../audiotest.js/trunk/audiotest.js');
load('../../src/audiofile/audiofile.js');
load('../../src/audiolet/Audiolet.js');
load('../Environment.js');

function testInit() {
    var audiolet = new Audiolet();
    var node = new PassThroughNode(audiolet, 3, 4);
    Assert.assertEquals(node.inputs.length, 3, "Actual number of inputs");
    Assert.assertEquals(node.outputs.length, 4, "Actual number of outputs");
}

test("Initialization", testInit);

function testCreateOutputSamples() {
    var audiolet = new Audiolet();
    var node = new PassThroughNode(audiolet, 1, 2);

    // Fill input buffer - should get copied over
    var inputBuffer = node.inputs[0].samples = [1, 2]

    node.createOutputSamples();

    Assert.assertEquals(node.outputs.length, 2, "Number of outputs");

    Assert.assertEquals(node.outputs[0].samples.length, 2,
                        "Number of channels 1");
    Assert.assertEquals(node.outputs[1].samples.length, 1,
                        "Number of channels 2");

    Assert.assertEquals(node.outputs[0].samples[0], 1, "Value 1");
    Assert.assertEquals(node.outputs[0].samples[1], 2, "Value 2");

    Assert.assertEquals(node.outputs[1].samples[0], 0, "Value 3");
}

test("Output sample creation", testCreateOutputSamples);

