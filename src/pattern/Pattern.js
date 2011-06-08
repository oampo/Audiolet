var Pattern = function() {
}

Pattern.prototype.next = function() {
  return null;
}

Pattern.prototype.valueOf = function(item) {
  if (item instanceof Pattern) {
    return (item.next());
  }
  else {
    return (item);
  }
}

Pattern.prototype.reset = function() {
}

