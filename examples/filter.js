var context = new audiolet.Audiolet();
var sine = new audiolet.dsp.WhiteNoise(context);
var filter = new audiolet.dsp.LowPassFilter(context, 200);
sine.connect(filter);
filter.connect(context.output);
