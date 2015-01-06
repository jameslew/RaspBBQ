/**
 * Module dependencies.
 */

var express = require('express');
//var routes = require('./routes');
var http = require('http');
var path = require('path');
var raspBBQ = require('./routes/raspBBQ.js');
var LCDPLATE = require('adafruit-i2c-lcd').plate;
var favicon = require('serve-favicon');
var logger = require('morgan');
var bodyParser = require('body-parser');
var serveStatic = require('serve-static');
var methodOverride = require('method-override');
var sleep = require('sleep');
var errorHandler = require('errorhandler');
var app = express();
var lcd = new LCDPLATE('/dev/i2c-1', 0x20);
var netUtils = require('./utils.js');
var RunLog = [];
var request = require('request');

lcd.backlight(lcd.colors.RED);

netUtils.getNetworkIPs(function (error, ip) {
    console.log("ip: " + ip);
    lcd.message("RaspBBQ 1.1\n" + ip);
    
    if (error) {
        console.log('error:', error);
    }
}, false);

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(favicon(__dirname + '/public/images/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(methodOverride());
app.use(require('stylus').middleware(path.join(__dirname, 'public')));
app.use(serveStatic(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
    app.use(errorHandler());
}

var targetFood, targetPit, maxPit, minPit, probeTimer;

//app.get('/', routes.index);

app.get('/bbqInit/:targetFood/:targetPit/:maxPit/:minPit', function (req, res) {
    
    console.log(req.params);
    
    var targetFood = req.params.targetFood;
    var targetPit = req.params.targetPit;
    var maxPit = req.params.maxPit;
    var minPit = req.params.minPit;
    
    probeTimer = setInterval(function () {
        
        var Probe1Temp, pitProbeTempF = 0.0;
        var Probe2Temp, foodProbeTempF = 0.0;
        var Probe3Temp, probe3TempF = 0.0;
        var Probe4Temp, probe4TempF = 0.0;
        
        raspBBQ.readTemp(0, function (err, pitProbeTempF) {
            pitProbeVal = pitProbeTempF;
        });
        
        raspBBQ.readTemp(1, function (err, foodProbeTempF) {
            foodProbeVal = foodProbeTempF;
        });
        
        raspBBQ.readTemp(2, function (err, probe3TempF) {
            probe3Val = probe3TempF;
        });
        
        raspBBQ.readTemp(3, function (err, probe4TempF) {
            probe4Val = probe4TempF;
        });
        
        //keep the list at 250 items, we don't need that much history.
        while (RunLog.length > 249) {
            RunLog.shift();
        }
        
        RunLog.push({ pitProbe: pitProbeVal, foodProbe: foodProbeVal, probe3Temp: probe3Val, probe4Temp: probe4Val, timestamp: Date.now() });
        request({
            uri: 'http://grovestreams.com:80/api/feed?api_key=0b606c5f-966b-320b-befa-3b8a3a237618&compid=bbqPit&pitProbe=' + Math.round(pitProbeVal * 100) / 100 + '&foodProbe=' + Math.round(foodProbeVal * 100) / 100,
            method: 'PUT'
        }
                , function (error, response, body) {
            console.log(body);
        });
        lcd.home();
        lcd.clear();
        lcd.message('Pit: ' + Math.round(pitProbeVal * 100) / 100 + '\nFood: ' + Math.round(foodProbeVal * 100) / 100);
        console.log(RunLog.length);

    }, 1000 * 300);
    
    res.send([{}]);

});

app.get('/bbqEnd', function (req, res) {
    
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

app.get('/bbqTemps', function (req, res) {
    
    if (RunLog.length != 0) {
        var lastBbqTemps = RunLog[RunLog.length - 1];
        //        console.log (lastBbqTemps);
        //        console.log('Pit: ' + lastBbqTemps.pitProbe + 'Food: ' + lastBbqTemps.foodProbe);
        
        res.send([{ pitProbe: lastBbqTemps.pitProbe }, { foodProbe: lastBbqTemps.foodProbe }, { probe3: lastBbqTemps.probe3Temp }, { probe4: lastBbqTemps.probe4Temp }]);
    } else res.send([{ pitProbe: 0 }, { foodProbe: 0 }, { probe3: 0 }, { probe4: 0 }]);

});

app.get('/bbqTest/:pitProbe/:foodProbe', function (req, res) {
    lcd.home();
    lcd.clear();
    lcd.message('Pit: ' + req.params.pitProbe + '\nFood: ' + req.params.foodProbe);
    res.send([{ pitProbe: req.params.pitProbe }, { foodProbe: req.params.foodProbe }]);
});

http.createServer(app).listen(app.get('port'), function () {
    console.log('Express server listening on port ' + app.get('port'));
});
