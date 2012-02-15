var WebKitBufferPlayer = function(audiolet, onComplete) {
    AudioletNode.call(this, audiolet, 0, 1);
    this.onComplete = onComplete;
    this.isWebKit = this.audiolet.device.sink instanceof Sink.sinks.webkit;
    this.ready = false;

    // Until we are loaded, output no channels.
    this.setNumberOfOutputChannels(0, 0);
    
    if (!this.isWebKit) {
        return;
    }

    this.context = this.audiolet.device.sink._context;
    this.jsNode = null;
    this.source = null;

    this.ready = false;
    this.loaded = false;

    this.buffers = [];
    this.readPosition = 0;

    this.endTime = null;
};
extend(WebKitBufferPlayer, AudioletNode);

WebKitBufferPlayer.prototype.load = function(url, onLoad, onError) {
    if (!this.isWebKit) {
        return;
    }

    this.stop();

    // Request the new file
    this.xhr = new XMLHttpRequest();
    this.xhr.open("GET", url, true);
    this.xhr.responseType = "arraybuffer";
    this.xhr.onload = this.onLoad.bind(this, onLoad, onError);
    this.xhr.onerror = onError;
    this.xhr.send();
};

WebKitBufferPlayer.prototype.stop = function() {
    this.ready = false;
    this.loaded = false;

    this.buffers = [];
    this.readPosition = 0;
    this.endTime = null;

    this.setNumberOfOutputChannels(0);
   
    this.disconnectWebKitNodes();
};

WebKitBufferPlayer.prototype.disconnectWebKitNodes = function() {
    if (this.source && this.jsNode) {
        this.source.disconnect(this.jsNode);
        this.jsNode.disconnect(this.context.destination);
        this.source = null;
        this.jsNode = null;
    }
};

WebKitBufferPlayer.prototype.onLoad = function(onLoad, onError) {
    // Load the buffer into memory for decoding
//    this.fileBuffer = this.context.createBuffer(this.xhr.response, false);
    this.context.decodeAudioData(this.xhr.response, function(buffer) {
        this.onDecode(buffer);
        onLoad();
    }.bind(this), onError);
};

WebKitBufferPlayer.prototype.onDecode = function(buffer) {
    this.fileBuffer = buffer;

    // Create the WebKit buffer source for playback
    this.source = this.context.createBufferSource();
    this.source.buffer = this.fileBuffer;

    // Make sure we are outputting the right number of channels on Audiolet's
    // side
    var numberOfChannels = this.fileBuffer.numberOfChannels;
    this.setNumberOfOutputChannels(0, numberOfChannels);

    // Create the JavaScript node for reading the data into Audiolet
    this.jsNode = this.context.createJavaScriptNode(4096, numberOfChannels, 0);
    this.jsNode.onaudioprocess = this.onData.bind(this);

    // Connect it all up
    this.source.connect(this.jsNode);
    this.jsNode.connect(this.context.destination);
    this.source.noteOn(0);
    this.endTime = this.context.currentTime + this.fileBuffer.duration;

    this.loaded = true;
};

WebKitBufferPlayer.prototype.onData = function(event) {
    if (this.loaded) {
        this.ready = true;
    }

    var numberOfChannels = event.inputBuffer.numberOfChannels;

    for (var i=0; i<numberOfChannels; i++) {
        this.buffers[i] = event.inputBuffer.getChannelData(i);
        this.readPosition = 0;
    }
};

WebKitBufferPlayer.prototype.generate = function() {
    if (!this.ready) {
        return;
    }

    var output = this.outputs[0];

    var numberOfChannels = output.samples.length;
    for (var i=0; i<numberOfChannels; i++) {
        output.samples[i] = this.buffers[i][this.readPosition];
    }
    this.readPosition += 1;

    if (this.context.currentTime > this.endTime) {
        this.stop();
        this.onComplete();
    }
};
