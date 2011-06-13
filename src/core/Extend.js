/*
 * A method for extending a javascript pseudo-class
 * Taken from
 * http://peter.michaux.ca/articles/class-based-inheritance-in-javascript
 *
 * @param {Object} subclass The class to extend.
 * @param {Object} superclass The class to be extended.
 */
function extend(subclass, superclass) {
    function Dummy() {}
    Dummy.prototype = superclass.prototype;
    subclass.prototype = new Dummy();
    subclass.prototype.constructor = subclass;
}
