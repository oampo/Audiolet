window.addEvent("domready", function() {
    var AudioletApp = new Class({
        initialize: function() {
            this.audiolet = new Audiolet();
        }
    });

    this.audiolet_app = new AudioletApp();
});


