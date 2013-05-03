/*!
 * @depends AudioletClass.js
 */

/**
 * An event emitter.
 */

 var EventEmitter = AudioletClass.extend({

    /**
     * Bind a function to some event.
     *
     * @param {String} e The event to bind to.
     * @param {Function} fn A function to execute.
     */
    on: function(e, fn) {
        this._events = this._events || {};
        this._events[e] = this._events[e] || [];
        this._events[e].push(fn);
    },

    /**
     * Unind some event handler.
     *
     * @param {String} e The event to release handlers from.
     * @param {Function} fn A specific function to release.
     */
    off: function(e, fn) {
        this._events = this._events || {};
        if(e in this._events === false) {
            return;
        }
        this._events[e].splice(this._events[e].indexOf(fn), 1);
    },

    /**
     * Execute some event handler(s).
     *
     * @param {String} e The event to trigger.
     * @param {arguments} arguments Arguments to pass to the handlers.
     */
    trigger: function(e) {
        this._events = this._events || {};
        if (e in this._events === false) {
            return;
        }
        for(var i = 0; i < this._events[e].length; i++){
            this._events[e][i].apply(this, Array.prototype.slice.call(arguments, 1));
        }
    }

});