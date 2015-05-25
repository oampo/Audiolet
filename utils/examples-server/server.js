var path = require('path');

var express = require('express');
var swig = require('swig');

var app = express();

var package = require('../../package.json');
var audiolet = package.name + '.' + package.version + '.js';

app.engine('html', swig.renderFile);
app.set('view engine', 'html');
app.set('views', __dirname + '/templates');

app.use('/examples', express.static(__dirname + '/../../examples'));
app.use(express.static(__dirname + '/public'));

app.get('/', function (req, res) {
    res.render('index');
});

app.get('/:name', function (req, res) {
    res.render('example', {
        audiolet: '/js/' + audiolet,
        src: '/examples/' + req.params.name + '.js'
    });
});

app.get('/js/' + audiolet, function(req, res) {
    res.sendFile(path.resolve(__dirname + '/../../build/' + audiolet));
});



var server = app.listen(8080, function () {
    console.log('Listening at http://localhost:8080');
    console.log(path.resolve(__dirname + '/../../build/' + audiolet));
});
