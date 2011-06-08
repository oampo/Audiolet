/**
 * @depends TableLookupOscillator.js
 */
var Triangle = function(audiolet, frequency) {
  Triangle.superclass.call(this, audiolet, Triangle.TABLE, frequency); 
}
extend(Triangle, TableLookupOscillator);

Triangle.prototype.toString = function() {
  return 'Triangle';
}

Triangle.TABLE = [];
for (var i = 0; i < 8192; i++) {
  // Smelly, but looks right...
  Triangle.TABLE.push(Math.abs(((((i - 2048) / 8192) % 1) + 1) % 1 * 2 - 1) * 2 - 1);
}

