/*!
 * @depends Scale.js
 */

/**
 * Minor scale.
 */
var MinorScale = Scale.extend({

    /*
     * Constructor
     *
     * @extends Scale
     */
    constructor: function() {
        Scale.call(this, [0, 2, 3, 5, 7, 8, 10]);
    }

});