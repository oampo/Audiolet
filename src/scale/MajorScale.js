/**
 * @depends Scale.js
 */
var MajorScale = function() {
    Scale.call(this, [0, 2, 4, 5, 7, 9, 11]);
};
extend(MajorScale, Scale);
