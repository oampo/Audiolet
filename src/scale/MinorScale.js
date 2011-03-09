/**
 * @depends Scale.js
 */
var MinorScale = new Class({
    Extends: Scale,
    initialize: function() {
        Scale.prototype.initialize.apply(this, [[0, 2, 3, 5, 7, 8, 10]]);
    }
});
