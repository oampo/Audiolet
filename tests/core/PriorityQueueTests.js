load('../../../../audiotest.js/trunk/audiotest.js');
load('../../src/audiofile/audiofile.js');
load('../../src/audiolet/Audiolet.js');

function testInitEmpty() {
    var queue = new PriorityQueue();
    Assert.assertEquals(queue.heap.length, 0, "Queue length");
}

test("Empty Initialization", testInitEmpty);

function testInitFull() {
    var queue = new PriorityQueue([5, 10, 1]);
    Assert.assertEquals(queue.heap.length, 3, "Queue length");
    Assert.assertEquals(queue.peek(), 1, "Value 1");
}

test("Full Initialization", testInitFull);

function testPush() {
    var queue = new PriorityQueue([5, 10, 1]);
    // Push lowest value
    queue.push(-1);
    Assert.assertEquals(queue.heap.length, 4, "Queue length");
    Assert.assertEquals(queue.peek(), -1, "Value 1");
    // Push non-lowest value
    queue.push(7);
    Assert.assertEquals(queue.peek(), -1, "Value 2");
}

test("Push", testPush);

function testPop() {
    var queue = new PriorityQueue([5, 10, 1]);
    var value = queue.pop();
    Assert.assertEquals(queue.heap.length, 2, "Queue length 1");
    Assert.assertEquals(value, 1, "Value 1");
    value = queue.pop();
    Assert.assertEquals(queue.heap.length, 1, "Queue length 2");
    Assert.assertEquals(value, 5, "Value 2");
    value = queue.pop();
    Assert.assertEquals(queue.heap.length, 0, "Queue length 3");
    Assert.assertEquals(value, 10, "Value 3");
}

test("Pop", testPop);
