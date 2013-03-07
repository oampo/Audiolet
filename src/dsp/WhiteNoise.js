/*!
 * @depends ../core/AudioletNode.js
 */

/**
 * A white noise source
 *
 * **Outputs**
 *
 * - White noise
 */
var WhiteNoise = AudioletNode.extend({

  /**
   * Constructor
   *
   * @extends AudioletNode
   * @param {Audiolet} audiolet The audiolet object.
   */
  constructor: function(audiolet) {
      AudioletNode.call(this, audiolet, 0, 1);
  },

  /**
   * Process samples
   */
  generate: function() {
      this.outputs[0].samples[0] = Math.random() * 2 - 1;
  },

  /**
   * toString
   *
   * @return {String} String representation.
   */
  toString: function() {
      return 'White Noise';
  }

});