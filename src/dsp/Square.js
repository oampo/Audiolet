/**
 * @depends TableLookupOscillator.js
 */
var Square = function(audiolet, frequency) {
  Square.superclass.call(this, audiolet, Square.TABLE, frequency); 
}
extend(Square, TableLookupOscillator);

Square.prototype.toString = function() {
  return 'Square';
}

Square.TABLE = [];
for (var i = 0; i < 8192; i++) {
  Square.TABLE.push(((i - 4096) / 8192) < 0 ? 1 : -1);
}


