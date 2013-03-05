/*!
 * @depends Scale.js
 */

/**
 * Minor scale.
 */
var MajorScale = Scale.extend({

    /*
     * Constructor
     *
     * @extends Scale
     */
    constructor: function() {
        Scale.call(this, [0, 2, 4, 5, 7, 9, 11]);
    }

});