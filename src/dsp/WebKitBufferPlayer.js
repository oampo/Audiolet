var WebKitBufferPlayer = function(audiolet, url) {
    AudioletNode.call(this, audiolet, 0, 1);
    this.isWebKit = this.audiolet.device.sink instanceof Sink.sinks.webkit;

    this.context = this.audiolet.device.sink._context;

    if (this.isWebKit) {
        this.xhr = new XMLHttpRequest();
        this.xhr.open("GET", url, true);
        this.xhr.responseType = "arraybuffer";
        this.xhr.onload = this.onLoad.bind(this);
        this.xhr.send();
    }

    this.ready = false;
};
extend(WebKitBufferPlayer, AudioletNode);

WebKitBufferPlayer.prototype.onLoad = function() {
    this.fileBuffer = this.context.createBuffer(this.xhr.response, false);
    this.setNumberOfOutputChannels(0, this.fileBuffer.numberOfChannels);

    this.jsNode = this.context.createJavaScriptNode(4096, this.fileBuffer.numberOfChannels, 0);
    this.jsNode.onaudioprocess = this.onData.bind(this);

    this.source = this.context.createBufferSource();
    this.source.buffer = this.fileBuffer;

    this.source.connect(this.jsNode);
    this.jsNode.connect(this.context.destination);
    this.source.noteOn(0);

    this.buffer = new AudioletBuffer(this.fileBuffer.numberOfChannels, 1024);
    this.ready = true;
};

WebKitBufferPlayer.prototype.onData = function(event) {
    var oldLength = this.buffer.length;
    var newLength = oldLength + event.inputBuffer.length;
    this.buffer.resize(this.buffer.numberOfChannels, newLength);

    for (var i=0; i<event.inputBuffer.numberOfChannels; i++) {
        var channelA = event.inputBuffer.getChannelData(i);
        var channelB = this.buffer.getChannelData(i);
        var bufferLength = event.inputBuffer.length;
        for (var j=0; j<event.inputBuffer.length; j++) {
            channelB[oldLength + j] = channelA[j];
        }
    }
};

WebKitBufferPlayer.prototype.generate = function(inputBuffers, outputBuffers) {
    var outputBuffer = outputBuffers[0];
    if (!this.ready) {
        outputBuffer.isEmpty = true;
        return;
    }

    if (this.buffer.length > outputBuffer.length) {
        this.buffer.shift(outputBuffer);
    }
    else {
        outputBuffer.isEmpty = true;
    }
};
