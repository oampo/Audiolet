var audiolet = new Audiolet(),
    keyboard = new MidiKeyboard(audiolet),
    instrument = new Instrument(audiolet);

keyboard.connect(instrument);
instrument.connect(audiolet.output);