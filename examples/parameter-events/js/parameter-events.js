function playExample() {

    var audiolet = new Audiolet();
    var sine = new Sine(audiolet);
    var notePattern = new PSequence([440, 330, 220], Infinity);

    sine.on('change:frequency', function(frequency) {
      console.log('frequency changed', frequency);
    });

    audiolet.scheduler.play([notePattern], 1, function(note) {
      sine.set('frequency', note);
    }.bind(this));

    sine.connect(audiolet.output);

    /*

    alternatively, you could do something like this:

    sine.frequency.on('change', function(frequency) {
      console.log('frequency changed', frequency);
    });

    */

};