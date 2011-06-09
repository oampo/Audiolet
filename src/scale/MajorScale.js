/**
 * @depends Scale.js
 */
var MajorScale = function() {
    MajorScale.superclass.call(this, [0, 2, 4, 5, 7, 9, 11]); 
}
extend(MajorScale, Scale);
