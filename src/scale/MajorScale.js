/**
 * @depends Scale.js
 */
var MajorScale = new Class({
    Extends: Scale,
    initialize: function() {
        Scale.prototype.initialize.apply(this, [[0, 2, 4, 5, 7, 9, 11]]);
    }
});
