/**
 * @depends TableLookupOscillator.js
 */
var Saw = function(audiolet, frequency) {
    TableLookupOscillator.call(this, audiolet, Saw.TABLE, frequency); 
}
extend(Saw, TableLookupOscillator);

Saw.prototype.toString = function() {
    return 'Saw';
}

Saw.TABLE = [];
for (var i = 0; i < 8192; i++) {
    Saw.TABLE.push(((((i - 4096) / 8192) % 1) + 1) % 1 * 2 - 1);
}

