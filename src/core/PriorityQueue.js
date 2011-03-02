// Priority Queue based on python heapq module
// http://svn.python.org/view/python/branches/release27-maint/Lib/heapq.py
var PriorityQueue = new Class({
    initialize: function(array, compare) {
        if (compare) {
            this.compare = compare;
        }

        if (array) {
            this.heap = array;
            for (var i = 0; i < Math.floor(this.heap.length / 2); i++) {
                this.siftUp(i);
            }
        }
        else {
            this.heap = [];
        }
    },

    push: function(item) {
        this.heap.push(item);
        this.siftDown(0, this.heap.length - 1);
    },


    pop: function() {
        var lastElement, returnItem;
        lastElement = this.heap.pop();
        if (this.heap.length) {
            var returnItem = this.heap[0];
            this.heap[0] = lastElement;
            this.siftUp(0);
        }
        else {
            returnItem = lastElement;
        }
        return (returnItem);
    },

    peek: function() {
        return (this.heap[0]);
    },

    isEmpty: function() {
        return (this.heap.length == 0);
    },

    siftDown: function(startPosition, position) {
        var newItem = this.heap[position];
        while (position > startPosition) {
            var parentPosition = (position - 1) >> 1;
            var parent = this.heap[parentPosition];
            if (this.compare(newItem, parent)) {
                this.heap[position] = parent;
                position = parentPosition;
                continue;
            }
            break;
        }
        this.heap[position] = newItem;
    },

    siftUp: function(position) {
        var endPosition = this.heap.length;
        var startPosition = position;
        var newItem = this.heap[position];
        var childPosition = 2 * position + 1;
        while (childPosition < endPosition) {
            var rightPosition = childPosition + 1;
            if (rightPosition < endPosition &&
                !this.compare(this.heap[childPosition],
                              this.heap[rightPosition])) {
                childPosition = rightPosition;
            }
            this.heap[position] = this.heap[childposition];
            position = childPosition;
            childPosition = 2 * position + 1;
        }
        this.heap[position] = newItem;
        siftDown(startPosition, position);
    },

    compare: function(a, b) {
        return (a < b);
    }
});
