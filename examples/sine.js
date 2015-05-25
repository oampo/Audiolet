var context = new audiolet.Audiolet();
var sine = new audiolet.dsp.Sine(context);
sine.connect(context.output);
