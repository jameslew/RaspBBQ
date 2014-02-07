
/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');
var http = require('http');
var path = require('path');
var raspBBQ = require('./routes/raspBBQ.js');
var LCDPLATE = require('adafruit-i2c-lcd').plate;
var sleep = require('sleep');

var app = express();
var lcd = new LCDPLATE ('/dev/i2c-1', 0x20);
lcd.backlight(lcd.colors.RED);
lcd.message("Welcome\nPitmaster");

var RunLog = [];

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(app.router);
app.use(require('stylus').middleware(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

var targetFood, targetPit, maxPit, minPit, probeTimer;

app.get('/', routes.index);

app.get('/bbqInit/:targetFood/:targetPit/:maxPit/:minPit', function(req, res) {
//app.get('/bbqInit', function (req, res) {

    console.log(req.params);

    var targetFood = req.params.targetFood;
    var targetPit = req.params.targetPit;
    var maxPit = req.params.maxPit;
    var minPit = req.params.minPit;

    probeTimer = setInterval(function () {

        var pitProbeVal, pitProbeVoltage = 0.0;
        var foodProbeVal, foodProbeVoltage = 0.0;

        raspBBQ.pitProbeGet(function (err, pitProbeTempF, pitProbeVoltVal) {
            pitProbeVal = pitProbeTempF;
            pitProbeVoltage = pitProbeVoltVal;
        });

        raspBBQ.foodProbeGet(function (err, foodProbeTempF, foodProbeVoltVal) {
            foodProbeVal = foodProbeTempF;
            foodProbeVoltage = foodProbeVoltVal;
        });

        RunLog.push({ pitProbe: pitProbeVal, pitVoltage: pitProbeVoltage, foodProbe: foodProbeVal, foodVoltage: foodProbeVoltage, timestamp: Date.now() });
//        console.log("Runlog Length " + RunLog.length);

    }, 1000 * 15);

    res.send([{}]);

});

app.get('/bbqEnd', function(req, res) {

    lcd.home();
    lcd.clear();
    lcd.backlight(lcd.colors.OFF);
    lcd.close();
    clearInterval(probeTimer);

    res.send([{}]);

});

app.get('/bbqDump', function (req, res) {

    res.send([RunLog]);

});

app.get('/bbqTemps', function(req, res) {

    if (RunLog.length != 0) {
        var lastBbqTemps = RunLog[RunLog.length-1];
//        console.log (lastBbqTemps);

        lcd.home();
        lcd.clear();
        lcd.message('Pit: ' + lastBbqTemps.pitProbe + '\nFood: ' + lastBbqTemps.foodProbe);
//        console.log('Pit: ' + lastBbqTemps.pitProbe + 'Food: ' + lastBbqTemps.foodProbe);

        res.send([{ pitProbe: lastBbqTemps.pitProbe }, { pitVoltage: lastBbqTemps.pitVoltage }, { foodProbe: lastBbqTemps.foodProbe }, { foodVoltage: lastBbqTemps.foodVoltage }]);
    } else res.send([{ pitProbe: 0 }, { pitVoltage: 0 }, { foodProbe: 0 }, { foodVoltage: 0 }]);
    
});

app.get('/bbqTest/:pitProbe/:foodProbe', function(req, res) {
    lcd.home();
    lcd.clear();
    lcd.message( 'Pit: '+req.params.pitProbe+ '\nFood: ' + req.params.foodProbe);
    res.send([{pitProbe:req.params.pitProbe}, {foodProbe:req.params.foodProbe}]);
    });

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
