/**
 * @depends Pattern.js
 */

var PArithmetic = function(start, step, repeats) {
  PArithmetic.superclass.call(this);
  this.start = start;
  this.value = start;
  this.step = step;
  this.repeats = repeats;
  this.position = 0;
}
extend(PArithmetic, Pattern);

PArithmetic.prototype.next = function() {
  var returnValue;
  if (this.position == 0) {
    returnValue = this.value;
    this.position += 1;
  }
  else if (this.position < this.repeats) {
    var step = this.valueOf(this.step);
    if (step != null) {
      this.value += step;
      returnValue = this.value;
      this.position += 1;
    }
    else {
      returnValue = null;
    }
  }
  else {
    returnValue = null;
  }
  return (returnValue);
}

PArithmetic.prototype.reset = function() {
  this.value = this.start;
  this.position = 0;
  if (this.step instanceof Pattern) {
    this.step.reset();
  }
}

var Pseries = PArithmetic;

