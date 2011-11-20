// I'm using as big of a buffer as possible (65536 = 2^32) to avoid glitches
// but higher buffer sizes will produce higher latency times.
var bufferSize = 65536;
var sampleRate = 44100;
// calculate the latency so it can be later used to synchronize the audio
// with the graphics.
var latency = 1000 * bufferSize / sampleRate;
var audioletReady = false;

function playExample() {
  var AudioletApp = function() {
    this.audiolet = new Audiolet(sampleRate, 2, bufferSize);
    this.audiolet.scheduler.setTempo(100);

    // Create empty buffers for the bass drum, hi hat and snare drum
    this.bd = new AudioletBuffer(1, 0);
    this.hh = new AudioletBuffer(1, 0);
    this.sn = new AudioletBuffer(1, 0);
    // Load wav files using synchronous XHR
    this.bd.load('audio/bd_stereo.wav', false);
    this.hh.load('audio/hh_stereo.wav', false);
    this.sn.load('audio/sn_stereo.wav', false);


    // Create buffer players
    this.playerBd = new BufferPlayer(this.audiolet, this.bd, 1, 0, 0);
    this.playerHh = new BufferPlayer(this.audiolet, this.hh, 1, 0, 0);
    this.playerSn = new BufferPlayer(this.audiolet, this.sn, 1, 0, 0);

    // Create trigger to re-trigger the playback of samples
    this.triggerBd = new TriggerControl(this.audiolet);
    this.triggerHh = new TriggerControl(this.audiolet);
    this.triggerSn = new TriggerControl(this.audiolet);

    // Create gain objects to control the individual gain of samples
    this.gainBd = new Gain(this.audiolet, 1.00);
    this.gainHh = new Gain(this.audiolet, 0.80);
    this.gainSn = new Gain(this.audiolet, 0.80);
    // Create pan objects to control the individual gain of samples
    this.panBd = new Pan(this.audiolet, 0.45);
    this.panHh = new Pan(this.audiolet, 0.65);
    this.panSn = new Pan(this.audiolet, 0.40);

    // Connect it all up
    //
    // output of trigger to input of player
    this.triggerBd.connect(this.playerBd, 0, 1);
    this.triggerHh.connect(this.playerHh, 0, 1);
    this.triggerSn.connect(this.playerSn, 0, 1);
    // output of player to input of gain
    this.playerBd.connect(this.gainBd);
    this.playerHh.connect(this.gainHh);
    this.playerSn.connect(this.gainSn);
    // output of gain to input of pan
    this.gainBd.connect(this.panBd);
    this.gainHh.connect(this.panHh);
    this.gainSn.connect(this.panSn);
    // output of pan to general output
    // all three signals will be added together when connected to the output
    this.panHh.connect(this.audiolet.output);
    this.panBd.connect(this.audiolet.output);
    this.panSn.connect(this.audiolet.output);


    // Create default patterns:
    //
    // Each durations object specifies the duration of one note.
    // 0.25 is equal to a sixtenth note (or if you prefer "semiquaver")
    //
    // The pattern objects specifies the amplitude of each sample:
    // 0 -> mute
    // 1 -> medium
    // 2 -> loud
    var bdDurations = new PSequence([0.25], Infinity);
    this.bdPattern = new PSequence([1, 0, 1, 1,   0, 1, 0, 2,
                                    2, 0, 1, 0,   0, 1, 0, 0,
                                    1, 0, 1, 1,   0, 1, 0, 2,
                                    2, 0, 1, 0,   1, 0, 2, 0], Infinity);

    var hhDurations = new PSequence([0.25], Infinity);
    this.hhPattern = new PSequence([1, 0, 0, 0,   2, 0, 0, 0,
                                    1, 0, 0, 0,   2, 0, 0, 0,
                                    1, 0, 0, 0,   2, 0, 0, 0,
                                    1, 0, 0, 0,   2, 0, 0, 0], Infinity);

    var snDurations = new PSequence([0.25], Infinity);
    this.snPattern = new PSequence([0, 0, 0, 0,   1, 0, 0, 0,
                                    0, 0, 0, 0,   2, 0, 0, 0,
                                    0, 0, 0, 0,   1, 0, 0, 0,
                                    0, 1, 0, 0,   2, 0, 0, 1], Infinity);


    // The scheduler will play the notes in bdPattern (amplitude)
    // every bdDurations (time)
    this.audiolet.scheduler.play([this.bdPattern], bdDurations,
      function(bdPattern, bdDurations) {

        // apply amplitude
        if (bdPattern == 2)
          this.gainBd.gain.setValue(1.00);
        else if (bdPattern == 1)
          this.gainBd.gain.setValue(0.70);
        else
          this.gainBd.gain.setValue(0.00);

        // draw animation of drum machine.
        // to make up for latency, the animate function will be called
        // after latency milliseconds.
        setTimeout("animate()", latency);
        // re-trigger the sample
        this.triggerBd.trigger.setValue(1);

      }.bind(this)
    );

    this.audiolet.scheduler.play([this.hhPattern], hhDurations,
      function(hhPattern) {
        // apply amplitude
        if (hhPattern == 2)
          this.gainHh.gain.setValue(0.70);
        else if (hhPattern == 1)
          this.gainHh.gain.setValue(0.30);
        else
          this.gainHh.gain.setValue(0.00);
        // re-trigger the sample
        this.triggerHh.trigger.setValue(1);
      }.bind(this)
    );

    this.audiolet.scheduler.play([this.snPattern], snDurations,
      function(snPattern) {
        // apply amplitude
        if (snPattern != 0)
          this.gainSn.gain.setValue(0.70);
        else if (snPattern == 1)
          this.gainSn.gain.setValue(0.20);
        else
          this.gainSn.gain.setValue(0.00);
        // re-trigger the sample
        this.triggerSn.trigger.setValue(1);
      }.bind(this)
    );
  }

  this.audioletApp = new AudioletApp();
  // this function gets the canvas_app.js initialized so it can interact
  // with the audioletApp.
  initCanvas();
};