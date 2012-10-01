var audiolet = new Audiolet(),
  arpeggiator = new Arpeggiator(audiolet),
  instrument = new Instrument(audiolet);

arpeggiator.connect(instrument);
instrument.connect(audiolet.output);

function playExample() {
    arpeggiator.noteOn(71, 255);
}