/*!
 * @depends ../core/AudioletNode.js
 */

/**
 * Inverse Fast Fourier Transform.  Code liberally stolen with kind permission
 * of Corben Brook from DSP.js (https://github.com/corbanbrook/dsp.js).
 *
 * **Inputs**
 *
 * - Fourier transformed audio
 * - Delay Time
 *
 * **Outputs**
 *
 * - Audio
 *
 * @constructor
 * @extends AudioletNode
 * @param {Audiolet} audiolet The audiolet object.
 * @param {Number} bufferSize The FFT buffer size.
 */
var IFFT = function(audiolet, bufferSize) {
    AudioletNode.call(this, audiolet, 2, 1);
    this.linkNumberOfOutputChannels(0, 0);
    this.bufferSize = bufferSize;
    this.readWriteIndex = 0;

    this.buffer = new Float32Array(this.bufferSize);

    this.realBuffer = new Float32Array(this.bufferSize);
    this.imaginaryBuffer = new Float32Array(this.bufferSize);

    this.reverseTable = new Uint32Array(this.bufferSize);
    this.calculateReverseTable();

    this.reverseReal = new Float32Array(this.bufferSize);
    this.reverseImaginary = new Float32Array(this.bufferSize);
};
extend(IFFT, AudioletNode);

/**
 * Process samples
 */
IFFT.prototype.generate = function() {
    var input = this.inputs[0];
    var output = this.outputs[0];

    if (!input.samples.length) {
        return;
    }

    var values = input.samples[0];
    this.realBuffer[this.readWriteIndex] = values[0];
    this.imaginaryBuffer[this.readWriteIndex] = values[1];
    output.samples[0] = this.buffer[this.readWriteIndex];

    this.readWriteIndex += 1;
    if (this.readWriteIndex >= this.bufferSize) {
        this.transform();
        this.readWriteIndex = 0;
    }
};

/**
 * Precalculate the reverse table.
 * TODO: Split the function out so it can be reused in FFT and IFFT
 */
IFFT.prototype.calculateReverseTable = function() {
    var limit = 1;
    var bit = this.bufferSize >> 1;

    while (limit < this.bufferSize) {
        for (var i = 0; i < limit; i++) {
            this.reverseTable[i + limit] = this.reverseTable[i] + bit;
        }

        limit = limit << 1;
        bit = bit >> 1;
    }
};

/**
 * Calculate the inverse FFT for the saved real and imaginary buffers
 */
IFFT.prototype.transform = function() {
    var halfSize = 1;

    for (var i = 0; i < this.bufferSize; i++) {
        this.imaginaryBuffer[i] *= -1;
    }

    for (var i = 0; i < this.bufferSize; i++) {
        this.reverseReal[i] = this.realBuffer[this.reverseTable[i]];
        this.reverseImaginary[i] = this.imaginaryBuffer[this.reverseTable[i]];
    }
 
    this.realBuffer.set(this.reverseReal);
    this.imaginaryBuffer.set(this.reverseImaginary);


    while (halfSize < this.bufferSize) {
        var phaseShiftStepReal = Math.cos(-Math.PI / halfSize);
        var phaseShiftStepImag = Math.sin(-Math.PI / halfSize);
        var currentPhaseShiftReal = 1;
        var currentPhaseShiftImag = 0;

        for (var fftStep = 0; fftStep < halfSize; fftStep++) {
            i = fftStep;

            while (i < this.bufferSize) {
                var off = i + halfSize;
                var tr = (currentPhaseShiftReal * this.realBuffer[off]) -
                         (currentPhaseShiftImag * this.imaginaryBuffer[off]);
                var ti = (currentPhaseShiftReal * this.imaginaryBuffer[off]) +
                         (currentPhaseShiftImag * this.realBuffer[off]);

                this.realBuffer[off] = this.realBuffer[i] - tr;
                this.imaginaryBuffer[off] = this.imaginaryBuffer[i] - ti;
                this.realBuffer[i] += tr;
                this.imaginaryBuffer[i] += ti;

                i += halfSize << 1;
            }

            var tmpReal = currentPhaseShiftReal;
            currentPhaseShiftReal = (tmpReal * phaseShiftStepReal) -
                                    (currentPhaseShiftImag *
                                     phaseShiftStepImag);
            currentPhaseShiftImag = (tmpReal * phaseShiftStepImag) +
                                    (currentPhaseShiftImag *
                                     phaseShiftStepReal);
        }

        halfSize = halfSize << 1;
    }

    for (i = 0; i < this.bufferSize; i++) {
        this.buffer[i] = this.realBuffer[i] / this.bufferSize;
    }
};

/**
 * toString
 *
 * @return {String} String representation.
 */
IFFT.prototype.toString = function() {
    return 'IFFT';
};
