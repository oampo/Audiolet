var Pattern = new Class({
    initialize: function() {
    },

    next: function() {
        return null;
    },

    valueOf: function(item) {
        if (instanceOf(item, Pattern)) {
           return (item.next());
        }
        else {
            return (item);
        }
    },

    reset: function() {
    }
});

