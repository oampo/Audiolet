/**
 * A base Audiolet class exposing `extends`
 */
var AudioletClass = function() {

};

/**
 * Create a class method for extending objects.
 */
AudioletClass.extend = function(protoProps) {

  var parent = this,
    child;

  // The constructor function for the new subclass is either defined by you
  // (the "constructor" property in your `extend` definition), or defaulted
  // by us to simply call the parent's constructor.
  if (protoProps && protoProps.hasOwnProperty('constructor')) {
    child = protoProps.constructor;
  } else {
    child = function(){ parent.apply(this, arguments); };
  }

  // Set the prototype chain to inherit from `parent`, without calling
  // `parent`'s constructor function.
  var ctor = function(){};
  ctor.prototype = parent.prototype;
  child.prototype = new ctor();

  // Add prototype properties (instance properties) to the subclass,
  // if supplied.
  for (var key in protoProps) {
    if (protoProps.hasOwnProperty(key)) {
      child.prototype[key] = protoProps[key];
    }
  }

  // Correctly set child's `prototype.constructor`.
  child.prototype.constructor = child;

  // Expose `extend` method.
  child.extend = this.extend;

  return child;

};